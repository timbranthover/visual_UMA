import { REPLACEMENTS } from "../data/securities";
import type { AssetClassId, Authority, Household, TaxLot } from "../types";
import { addDays, buildSnapshot, findAccount, findSleeve, sec, termOf, type Snapshot } from "./snapshot";
import { harvestCandidates, locationFindings } from "./tax";
import { day } from "../format";

/* ----------------------------------------------------------------------------
 * Proposal model
 * ------------------------------------------------------------------------- */

export type ActionKind = "concentration" | "harvest" | "location";

export interface Trade {
  id: string;
  accountId: string;
  sleeveId: string;
  securityId: string;
  side: "Sell" | "Buy";
  quantity: number;
  price: number;
  amount: number;
  /** Specific lot sold (sells only). */
  lotId?: string;
  /** Realised gain on the sell; tax-relevant only in taxable accounts. */
  realized?: number;
  term?: "ST" | "LT";
  taxable?: boolean;
  note?: string;
  authority: Authority;
}

export interface CashMove {
  accountId: string;
  fromSleeveId: string;
  toSleeveId: string;
  amount: number;
  authority: Authority;
}

export interface Restriction {
  securityId: string;
  label: string;
  until?: string;
}

export interface Requirement {
  authority: Authority;
  label: string;
}

export interface Action {
  id: string;
  kind: ActionKind;
  title: string;
  summary: string;
  rationale: string[];
  trades: Trade[];
  cashMoves: CashMove[];
  restrictions: Restriction[];
  requirements: Requirement[];
}

export interface GuardEvent {
  actionId: string;
  message: string;
}

export interface Proposal {
  actions: Action[];
  guardEvents: GuardEvent[];
}

let tradeSeq = 0;
const tid = () => `T${String(++tradeSeq).padStart(3, "0")}`;

const sleeveAuthority = (h: Household, sleeveId: string) => findSleeve(h, sleeveId).authority;

/** Moving cash between sub-accounts changes the target allocation: FA in AAP, client in SWP. */
const reallocationAuthority = (h: Household, accountId: string): Authority =>
  findAccount(h, accountId).program === "AAP" ? "FA" : "CLIENT";

function sellLot(h: Household, accountId: string, sleeveId: string, l: TaxLot, quantity: number, note?: string): Trade {
  const s = sec(l.securityId);
  const amount = quantity * s.price;
  const taxable = findAccount(h, accountId).taxTreatment === "Taxable";
  return {
    id: tid(),
    accountId,
    sleeveId,
    securityId: l.securityId,
    side: "Sell",
    quantity,
    price: s.price,
    amount,
    lotId: l.id,
    realized: quantity * (s.price - l.unitCost),
    term: termOf(l.acquired, h.asOf),
    taxable,
    note,
    authority: sleeveAuthority(h, sleeveId),
  };
}

function buy(h: Household, accountId: string, sleeveId: string, securityId: string, budget: number, note?: string): Trade {
  const s = sec(securityId);
  const quantity = Math.floor(budget / s.price);
  return {
    id: tid(),
    accountId,
    sleeveId,
    securityId,
    side: "Buy",
    quantity,
    price: s.price,
    amount: quantity * s.price,
    note,
    authority: sleeveAuthority(h, sleeveId),
  };
}

const fundsSleeve = (h: Household, accountId: string) => findAccount(h, accountId).sleeves.find((s) => s.kind === "Funds")!;

/** Representative fund used to add exposure to an asset class. */
const CLASS_FUND: Partial<Record<AssetClassId, string>> = {
  US_LARGE: "VOO",
  US_SMID: "IJH",
  INTL_DEV: "VEA",
  EM: "IEMG",
  CORE_BOND: "AGG",
  MUNI: "VTEB",
};

/* ----------------------------------------------------------------------------
 * Generators
 * ------------------------------------------------------------------------- */

function locationAction(h: Household, snap: Snapshot): Action | null {
  const finding = locationFindings(snap).find((f) => sec(f.securityId).taxProfile === "Inefficient");
  if (!finding) return null;

  // Shelter: tax-deferred account holding the most overweight equity class.
  const overweight = [...snap.allocation].filter((a) => a.id !== "CASH" && a.id !== "CORE_BOND" && a.id !== "MUNI").sort((a, b) => b.drift - a.drift)[0];
  const underweight = [...snap.allocation].filter((a) => a.id !== "CASH" && a.id !== "CORE_BOND" && a.id !== "MUNI").sort((a, b) => a.drift - b.drift)[0];
  const shelterPos = snap.sleeves
    .filter((s) => s.account.taxTreatment === "Tax-deferred")
    .flatMap((s) => s.positions)
    .filter((p) => p.security.assetClass === overweight.id && p.security.taxProfile === "Efficient")
    .sort((a, b) => b.value - a.value)[0];
  if (!shelterPos) return null;

  const taxablePos = snap.positions.find((p) => p.sleeveId === finding.sleeveId && p.security.id === finding.securityId)!;

  const trades: Trade[] = [];
  // 1. Taxable account: sell the bond fund, buy the most underweight equity class.
  for (const l of taxablePos.lots) trades.push(sellLot(h, taxablePos.accountId, taxablePos.sleeveId, l, l.quantity, "Move taxable bonds out of the taxable account"));
  const proceeds = trades.reduce((a, t) => a + t.amount, 0);
  trades.push(buy(h, taxablePos.accountId, taxablePos.sleeveId, CLASS_FUND[underweight.id]!, proceeds, `Adds ${underweight.id === "INTL_DEV" ? "international developed" : "underweight"} equity in the taxable account`));

  // 2. Tax-deferred account: sell overweight equity, buy the bond exposure inside the IRA.
  const shelterLots = [...shelterPos.lots].sort((a, b) => b.unitCost - a.unitCost);
  let need = Math.ceil(proceeds / shelterPos.security.price);
  const shelterSells: Trade[] = [];
  for (const l of shelterLots) {
    if (need <= 0) break;
    const q = Math.min(l.quantity, need);
    shelterSells.push(sellLot(h, shelterPos.accountId, shelterPos.sleeveId, l, q, "No tax: sale inside the IRA"));
    need -= q;
  }
  trades.push(...shelterSells);
  const shelterProceeds = shelterSells.reduce((a, t) => a + t.amount, 0);
  trades.push(buy(h, shelterPos.accountId, shelterPos.sleeveId, finding.securityId, shelterProceeds, "Bond exposure now earns interest tax-deferred"));

  const taxAcct = findAccount(h, taxablePos.accountId);
  const shelterAcct = findAccount(h, shelterPos.accountId);
  return {
    id: "location",
    kind: "location",
    title: "Swap bonds into the IRA",
    summary: `Hold ${taxablePos.security.ticker} inside ${shelterAcct.name} and equity in ${taxAcct.name}. Same risk, lower tax drag, and it closes the ${underweight.id === "INTL_DEV" ? "international" : "equity"} gap.`,
    rationale: [
      `${taxablePos.security.ticker} interest is taxed as ordinary income in a taxable account.`,
      `${shelterPos.security.ticker} in the IRA is tax-efficient and better held in the taxable account.`,
      `Buying ${sec(CLASS_FUND[underweight.id]!).ticker} instead of ${shelterPos.security.ticker} in the taxable account also reduces the ${overweight.id === "US_LARGE" ? "US large cap" : "equity"} overweight.`,
    ],
    trades,
    cashMoves: [],
    restrictions: [],
    requirements: [{ authority: "FA", label: `Fund and ETF trades in ${taxAcct.name} and ${shelterAcct.name} (AAP discretion)` }],
  };
}

function harvestAction(h: Household, snap: Snapshot, exclude: Set<string>): Action | null {
  const clear = harvestCandidates(snap).filter((c) => c.status === "Clear" && !exclude.has(c.lot.id));
  if (!clear.length) return null;
  const trades: Trade[] = [];
  const restrictions: Restriction[] = [];
  const until = addDays(h.asOf, 31);
  for (const c of clear) {
    const sell = sellLot(h, c.accountId, c.sleeveId, c.lot, c.lot.quantity, "Harvest loss");
    trades.push(sell);
    const rep = REPLACEMENTS[c.lot.securityId];
    if (rep) trades.push(buy(h, c.accountId, c.sleeveId, rep, sell.amount, `Temporary replacement for ${sec(c.lot.securityId).ticker}, keeps market exposure`));
    restrictions.push({ securityId: c.lot.securityId, label: `No purchases of ${sec(c.lot.securityId).ticker} in any sleeve of any household account`, until });
  }
  const blocked = harvestCandidates(snap).filter((c) => c.status === "Blocked");
  const elsewhere = harvestCandidates(snap).filter((c) => c.status === "Clear" && exclude.has(c.lot.id));
  return {
    id: "harvest",
    kind: "harvest",
    title: "Harvest losses across sleeves",
    summary: `Realize ${clear.length} losses in the overlay-managed SMA sleeves and hold replacements for 31 days. The losses offset the gain on the Apple trim.`,
    rationale: [
      "Each lot is sold whole, and a replacement that is not substantially identical keeps market exposure.",
      `The sold securities are blocked from purchase in all ${h.accounts.length} accounts until ${day(until)}, including the IRAs.`,
      blocked.length
        ? `${blocked.length} other loss ${blocked.length === 1 ? "lot was" : "lots were"} held back because of recent purchases elsewhere in the household.`
        : "No candidates were blocked by recent purchases.",
      ...elsewhere.map((c) => `The ${sec(c.lot.securityId).ticker} loss is realized by the asset-location swap instead, so it is not sold twice.`),
    ],
    trades,
    cashMoves: [],
    restrictions,
    requirements: [{ authority: "OVERLAY", label: "Premium tax management in SMA sleeves (UBS AM overlay)" }],
  };
}

function concentrationAction(h: Household, snap: Snapshot): Action | null {
  const breach = snap.exposures.find((e) => e.breach);
  if (!breach) return null;
  const excess = breach.total - h.policy.concentrationLimit * snap.total * 0.97; // land just inside the limit
  const id = breach.security.id;

  // Candidate lots: direct holdings. Tax-advantaged first, then lowest gain per share.
  const candidates = snap.sleeves
    .flatMap((s) => s.positions.filter((p) => p.security.id === id).flatMap((p) => p.lots.map((l) => ({ l, s }))))
    .sort((a, b) => {
      const ta = a.s.account.taxTreatment === "Taxable" ? 1 : 0;
      const tb = b.s.account.taxTreatment === "Taxable" ? 1 : 0;
      if (ta !== tb) return ta - tb;
      return a.l.gain / a.l.quantity - b.l.gain / b.l.quantity;
    });

  const trades: Trade[] = [];
  const cashMoves: CashMove[] = [];
  let remaining = excess;
  const proceedsBySleeve = new Map<string, { accountId: string; amount: number }>();
  for (const { l, s } of candidates) {
    if (remaining <= 0) break;
    const q = Math.min(l.quantity, Math.ceil(remaining / breach.security.price));
    const t = sellLot(h, s.account.id, s.sleeve.id, l, q, "Trim highest-cost lots first");
    trades.push(t);
    remaining -= t.amount;
    const cur = proceedsBySleeve.get(s.sleeve.id) ?? { accountId: s.account.id, amount: 0 };
    proceedsBySleeve.set(s.sleeve.id, { accountId: cur.accountId, amount: cur.amount + t.amount });
  }

  // Redeploy proceeds to the most underweight bond class, tax-appropriately.
  const bondTarget = [...snap.allocation].filter((a) => a.id === "MUNI" || a.id === "CORE_BOND").sort((a, b) => a.drift - b.drift)[0];
  for (const [sleeveId, { accountId, amount }] of proceedsBySleeve) {
    const acct = findAccount(h, accountId);
    const to = fundsSleeve(h, accountId);
    const cls: AssetClassId = acct.taxTreatment === "Taxable" ? "MUNI" : bondTarget.id;
    cashMoves.push({ accountId, fromSleeveId: sleeveId, toSleeveId: to.id, amount, authority: reallocationAuthority(h, accountId) });
    trades.push(buy(h, accountId, to.id, CLASS_FUND[cls]!, amount, "Redeploy trim proceeds into underweight municipal bonds"));
  }

  const accountsTouched = [...new Set(trades.map((t) => t.accountId))].map((a) => findAccount(h, a));
  const swp = accountsTouched.filter((a) => a.program === "SWP");
  const aap = accountsTouched.filter((a) => a.program === "AAP");
  const requirements: Requirement[] = [
    { authority: "CLIENT", label: `Approve household restriction: ${breach.security.ticker} capped at ${(h.policy.concentrationLimit * 100).toFixed(0)}% across all accounts` },
    { authority: "OVERLAY", label: `Execute trims in the SMA sleeves under the restriction` },
  ];
  if (aap.length) requirements.push({ authority: "FA", label: `Reallocate proceeds in ${aap.map((a) => a.name).join(", ")} (AAP discretion)` });
  if (swp.length) requirements.push({ authority: "CLIENT", label: `Authorize reallocation in ${swp.map((a) => a.name).join(", ")} (SWP)` });

  return {
    id: "concentration",
    kind: "concentration",
    title: `Bring ${breach.security.ticker} back under the ${(h.policy.concentrationLimit * 100).toFixed(0)}% limit`,
    summary: `${breach.security.ticker} is ${(breach.pct * 100).toFixed(1)}% of the household across ${breach.sleeveCount} sleeves and ${breach.accountCount} accounts. Trim the highest-cost lots and stop new purchases household-wide.`,
    rationale: [
      `Exposure counts direct holdings in two SMA sleeves plus look-through in ${new Set(breach.sources.filter((s) => s.viaFundId).map((s) => s.viaFundId)).size} index funds.`,
      "Lots are sold in order of lowest gain per share, so each dollar of risk reduction costs the least tax.",
      "Without a household restriction, either SMA manager could buy the shares back the next day.",
    ],
    trades,
    cashMoves,
    restrictions: [{ securityId: id, label: `${breach.security.ticker}: no new purchases in any sleeve; household cap ${(h.policy.concentrationLimit * 100).toFixed(0)}%` }],
    requirements,
  };
}

/* ----------------------------------------------------------------------------
 * Wash-sale guard over the whole proposal: no proposed purchase may land in a
 * security sold at a loss anywhere in the household within 30 days.
 * ------------------------------------------------------------------------- */

function guard(h: Household, actions: Action[]): GuardEvent[] {
  const events: GuardEvent[] = [];
  const lossSells = actions.flatMap((a) => a.trades).filter((t) => t.side === "Sell" && t.taxable && (t.realized ?? 0) < 0);
  const lossIds = new Set(lossSells.map((t) => t.securityId));
  for (const a of actions) {
    for (const t of a.trades) {
      if (t.side !== "Buy" || !lossIds.has(t.securityId)) continue;
      const rep = REPLACEMENTS[t.securityId];
      if (!rep || lossIds.has(rep)) continue;
      const seller = lossSells.find((s) => s.securityId === t.securityId)!;
      const fromTicker = sec(t.securityId).ticker;
      const replacement = buy(h, t.accountId, t.sleeveId, rep, t.amount, `Swapped from ${fromTicker} by the wash-sale guard`);
      Object.assign(t, { ...replacement, id: t.id });
      events.push({
        actionId: a.id,
        message: `Buying ${fromTicker} in ${findAccount(h, t.accountId).name} would wash the ${fromTicker} loss being realized in ${findAccount(h, seller.accountId).name}${findAccount(h, t.accountId).taxTreatment !== "Taxable" ? " and, inside an IRA, disallow it permanently" : ""}. Bought ${sec(rep).ticker} instead.`,
      });
    }
  }
  return events;
}

/* ----------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------- */

export function generateProposal(h: Household, snap: Snapshot = buildSnapshot(h)): Proposal {
  tradeSeq = 0;
  const actions: Action[] = [];
  const conc = concentrationAction(h, snap);
  const loc = locationAction(h, snap);
  const soldLots = new Set([...(loc?.trades ?? []), ...(conc?.trades ?? [])].filter((t) => t.lotId).map((t) => t.lotId!));
  const harv = harvestAction(h, snap, soldLots);
  if (conc) actions.push(conc);
  if (harv) actions.push(harv);
  if (loc) actions.push(loc);
  const guardEvents = guard(h, actions);
  // Number trades in display order.
  let n = 0;
  for (const a of actions) for (const t of a.trades) t.id = `T${String(++n).padStart(2, "0")}`;
  return { actions, guardEvents };
}

/** Apply selected actions to a copy of the household and return it. */
export function applyActions(h: Household, actions: Action[]): Household {
  const next: Household = structuredClone(h);
  const sleeveOf = (id: string) => next.accounts.flatMap((a) => a.sleeves).find((s) => s.id === id)!;
  let n = 0;
  const trades = actions.flatMap((a) => a.trades);
  for (const t of trades.filter((t) => t.side === "Sell")) {
    const s = sleeveOf(t.sleeveId);
    const l = s.lots.find((x) => x.id === t.lotId)!;
    l.quantity -= t.quantity;
    s.cash += t.amount;
  }
  for (const m of actions.flatMap((a) => a.cashMoves)) {
    sleeveOf(m.fromSleeveId).cash -= m.amount;
    sleeveOf(m.toSleeveId).cash += m.amount;
  }
  for (const t of trades.filter((t) => t.side === "Buy")) {
    const s = sleeveOf(t.sleeveId);
    s.lots.push({ id: `N${String(++n).padStart(3, "0")}`, securityId: t.securityId, quantity: t.quantity, unitCost: t.price, acquired: next.asOf });
    s.cash -= t.amount;
  }
  for (const a of next.accounts) for (const s of a.sleeves) s.lots = s.lots.filter((l) => l.quantity > 0);
  const realized = trades.filter((t) => t.side === "Sell" && t.taxable);
  for (const t of realized) {
    next.realizedYTD.push({ date: next.asOf, accountId: t.accountId, sleeveId: t.sleeveId, securityId: t.securityId, term: t.term!, amount: t.realized! });
  }
  return next;
}

/** Realized gains from a set of actions, taxable accounts only. */
export function proposalRealized(actions: Action[]) {
  const out = { ST: 0, LT: 0, gains: 0, losses: 0 };
  for (const t of actions.flatMap((a) => a.trades)) {
    if (t.side !== "Sell" || !t.taxable) continue;
    out[t.term!] += t.realized!;
    if (t.realized! > 0) out.gains += t.realized!;
    else out.losses += t.realized!;
  }
  return out;
}

export const AUTHORITY_LABEL: Record<Authority, string> = {
  OVERLAY: "Overlay manager · UBS AM",
  SMA_MANAGER: "SMA manager",
  FA: "Financial Advisor · AAP discretion",
  CLIENT: "Client approval",
};

export const AUTHORITY_SHORT: Record<Authority, string> = {
  OVERLAY: "Overlay",
  SMA_MANAGER: "SMA manager",
  FA: "Advisor",
  CLIENT: "Client",
};

/** Estimated federal tax on net realized gains (ST/LT netting; net losses produce no tax). */
export function estTax(h: Household, r: { ST: number; LT: number }) {
  let st = r.ST;
  let lt = r.LT;
  if (st < 0 && lt > 0) { lt += st; st = 0; }
  else if (lt < 0 && st > 0) { st += lt; lt = 0; }
  return Math.max(0, st) * h.policy.taxRates.ST + Math.max(0, lt) * h.policy.taxRates.LT;
}
