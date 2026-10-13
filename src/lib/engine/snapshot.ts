import { SECURITIES } from "../data/securities";
import type { Account, AssetClassId, Household, Security, Sleeve, TaxLot } from "../types";

/* ----------------------------------------------------------------------------
 * Dates
 * ------------------------------------------------------------------------- */

const DAY = 86_400_000;
export const toDate = (iso: string) => new Date(iso + "T00:00:00Z");
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);
export const addDays = (iso: string, days: number) => new Date(toDate(iso).getTime() + days * DAY).toISOString().slice(0, 10);
/** Long-term once held more than one year. */
export const termOf = (acquired: string, asOf: string): "ST" | "LT" => (daysBetween(acquired, asOf) > 365 ? "LT" : "ST");

export const sec = (id: string): Security => {
  const s = SECURITIES[id];
  if (!s) throw new Error(`Unknown security ${id}`);
  return s;
};

/* ----------------------------------------------------------------------------
 * Views
 * ------------------------------------------------------------------------- */

export interface LotView extends TaxLot {
  value: number;
  cost: number;
  gain: number;
  term: "ST" | "LT";
}

export interface PositionView {
  key: string;
  accountId: string;
  sleeveId: string;
  security: Security;
  quantity: number;
  value: number;
  cost: number;
  gain: number;
  lots: LotView[];
  pctOfHousehold: number;
}

export interface SleeveView {
  sleeve: Sleeve;
  account: Account;
  positions: PositionView[];
  cash: number;
  value: number;
  gain: number;
  pctOfAccount: number;
  pctOfHousehold: number;
}

export interface AccountView {
  account: Account;
  sleeves: SleeveView[];
  value: number;
  gain: number;
  pctOfHousehold: number;
}

export interface AllocationRow {
  id: AssetClassId;
  value: number;
  pct: number;
  target: number;
  drift: number;
  breach: boolean;
}

export interface ExposureSource {
  accountId: string;
  sleeveId: string;
  /** Present when the exposure comes through a fund. */
  viaFundId?: string;
  quantity?: number;
  value: number;
}

export interface ExposureRow {
  security: Security;
  sources: ExposureSource[];
  directValue: number;
  fundValue: number;
  total: number;
  pct: number;
  /** Distinct sleeves the exposure sits in. */
  sleeveCount: number;
  accountCount: number;
  /** Concentration rule applies to single issuers only. */
  breach: boolean;
}

export interface Snapshot {
  household: Household;
  total: number;
  accounts: AccountView[];
  sleeves: SleeveView[];
  positions: PositionView[];
  allocation: AllocationRow[];
  exposures: ExposureRow[];
}

/* ----------------------------------------------------------------------------
 * Snapshot: roll every lot up to sleeve, account and person level
 * ------------------------------------------------------------------------- */

export function buildSnapshot(h: Household): Snapshot {
  const accounts: AccountView[] = h.accounts.map((account) => {
    const sleeves: SleeveView[] = account.sleeves.map((sleeve) => {
      const byPos = new Map<string, LotView[]>();
      for (const l of sleeve.lots) {
        if (l.quantity <= 0) continue;
        const s = sec(l.securityId);
        const value = l.quantity * s.price;
        const cost = l.quantity * l.unitCost;
        const lv: LotView = { ...l, value, cost, gain: value - cost, term: termOf(l.acquired, h.asOf) };
        byPos.set(l.securityId, [...(byPos.get(l.securityId) ?? []), lv]);
      }
      const positions: PositionView[] = [...byPos.entries()].map(([securityId, lots]) => ({
        key: `${sleeve.id}:${securityId}`,
        accountId: account.id,
        sleeveId: sleeve.id,
        security: sec(securityId),
        quantity: lots.reduce((a, l) => a + l.quantity, 0),
        value: lots.reduce((a, l) => a + l.value, 0),
        cost: lots.reduce((a, l) => a + l.cost, 0),
        gain: lots.reduce((a, l) => a + l.gain, 0),
        lots: lots.sort((a, b) => a.acquired.localeCompare(b.acquired)),
        pctOfHousehold: 0,
      }));
      positions.sort((a, b) => b.value - a.value);
      const invested = positions.reduce((a, p) => a + p.value, 0);
      return {
        sleeve,
        account,
        positions,
        cash: sleeve.cash,
        value: invested + sleeve.cash,
        gain: positions.reduce((a, p) => a + p.gain, 0),
        pctOfAccount: 0,
        pctOfHousehold: 0,
      };
    });
    return {
      account,
      sleeves,
      value: sleeves.reduce((a, s) => a + s.value, 0),
      gain: sleeves.reduce((a, s) => a + s.gain, 0),
      pctOfHousehold: 0,
    };
  });

  const total = accounts.reduce((a, x) => a + x.value, 0);
  const sleeves = accounts.flatMap((a) => a.sleeves);
  const positions = sleeves.flatMap((s) => s.positions);

  for (const a of accounts) {
    a.pctOfHousehold = a.value / total;
    for (const s of a.sleeves) {
      s.pctOfAccount = s.value / a.value;
      s.pctOfHousehold = s.value / total;
      for (const p of s.positions) p.pctOfHousehold = p.value / total;
    }
  }

  // Person-level allocation (funds count in their own asset class; cash in every sleeve counts as cash).
  const byClass = new Map<AssetClassId, number>();
  for (const p of positions) byClass.set(p.security.assetClass, (byClass.get(p.security.assetClass) ?? 0) + p.value);
  byClass.set("CASH", (byClass.get("CASH") ?? 0) + sleeves.reduce((a, s) => a + s.cash, 0));
  const allocation: AllocationRow[] = (Object.keys(h.policy.target) as AssetClassId[]).map((id) => {
    const value = byClass.get(id) ?? 0;
    const pct = value / total;
    const target = h.policy.target[id];
    return { id, value, pct, target, drift: pct - target, breach: Math.abs(pct - target) > h.policy.driftBand };
  });

  // Issuer exposure: direct holdings plus fund look-through, for every security.
  const ex = new Map<string, ExposureSource[]>();
  const push = (id: string, src: ExposureSource) => ex.set(id, [...(ex.get(id) ?? []), src]);
  for (const p of positions) {
    push(p.security.id, { accountId: p.accountId, sleeveId: p.sleeveId, quantity: p.quantity, value: p.value });
    for (const c of p.security.lookThrough ?? []) {
      push(c.securityId, { accountId: p.accountId, sleeveId: p.sleeveId, viaFundId: p.security.id, value: p.value * c.weight });
    }
  }
  const exposures: ExposureRow[] = [...ex.entries()].map(([id, sources]) => {
    const security = sec(id);
    const directValue = sources.filter((s) => !s.viaFundId).reduce((a, s) => a + s.value, 0);
    const fundValue = sources.filter((s) => s.viaFundId).reduce((a, s) => a + s.value, 0);
    const t = directValue + fundValue;
    const isIssuer = security.type === "Stock" || security.type === "ADR";
    return {
      security,
      sources: sources.sort((a, b) => b.value - a.value),
      directValue,
      fundValue,
      total: t,
      pct: t / total,
      sleeveCount: new Set(sources.map((s) => s.sleeveId)).size,
      accountCount: new Set(sources.map((s) => s.accountId)).size,
      breach: isIssuer && t / total > h.policy.concentrationLimit,
    };
  });
  exposures.sort((a, b) => b.total - a.total);

  return { household: h, total, accounts, sleeves, positions, allocation, exposures };
}

/* ----------------------------------------------------------------------------
 * Lookups
 * ------------------------------------------------------------------------- */

export const findAccount = (h: Household, id: string) => h.accounts.find((a) => a.id === id)!;
export const findSleeve = (h: Household, id: string) => h.accounts.flatMap((a) => a.sleeves).find((s) => s.id === id)!;
export const memberFirstName = (h: Household, id: string) => h.members.find((m) => m.id === id)!.firstName;
