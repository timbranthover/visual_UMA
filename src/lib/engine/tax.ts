import type { Household } from "../types";
import { addDays, daysBetween, findAccount, findSleeve, memberFirstName, sec, type LotView, type Snapshot } from "./snapshot";

/* ----------------------------------------------------------------------------
 * Realized gains against the household gain budget (taxable accounts only)
 * ------------------------------------------------------------------------- */

export interface BudgetView {
  realized: { ST: number; LT: number };
  budget: { ST: number; LT: number };
  remaining: { ST: number; LT: number };
}

export function budgetView(h: Household, extra: { ST: number; LT: number } = { ST: 0, LT: 0 }): BudgetView {
  const realized = { ST: extra.ST, LT: extra.LT };
  for (const r of h.realizedYTD) {
    if (findAccount(h, r.accountId).taxTreatment !== "Taxable") continue;
    realized[r.term] += r.amount;
  }
  const budget = h.policy.gainBudget;
  return { realized, budget, remaining: { ST: budget.ST - realized.ST, LT: budget.LT - realized.LT } };
}

/* ----------------------------------------------------------------------------
 * Wash-sale guard
 *
 * Selling at a loss is disallowed if substantially identical securities were
 * bought within 30 days before or after the sale in ANY account of the
 * taxpayer or spouse, including IRAs (where the loss is lost permanently).
 * The guard checks every sleeve of every household account.
 * ------------------------------------------------------------------------- */

export interface WashConflict {
  accountId: string;
  sleeveId: string;
  quantity: number;
  date: string;
  /** Human-readable explanation. */
  reason: string;
  permanent: boolean;
}

export function recentPurchaseConflicts(h: Household, securityId: string, excludeLotId?: string): WashConflict[] {
  const out: WashConflict[] = [];
  for (const a of h.accounts) {
    for (const s of a.sleeves) {
      for (const l of s.lots) {
        if (l.securityId !== securityId || l.id === excludeLotId || l.quantity <= 0) continue;
        const d = daysBetween(l.acquired, h.asOf);
        if (d >= 0 && d <= 30) {
          const owner = a.owners.length > 1 ? "Joint" : memberFirstName(h, a.owners[0]) + "'s";
          const permanent = a.taxTreatment !== "Taxable";
          out.push({
            accountId: a.id,
            sleeveId: s.id,
            quantity: l.quantity,
            date: l.acquired,
            permanent,
            reason: `${owner} ${a.registration === "Joint (JTWROS)" ? "account" : a.registration} · ${s.name} bought ${l.quantity.toLocaleString("en-US")} ${sec(securityId).ticker} on ${fmtDay(l.acquired)}${permanent ? ". Because that purchase sits in an IRA, the loss would be permanently disallowed." : "."}`,
          });
        }
      }
    }
  }
  return out;
}

const fmtDay = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/* ----------------------------------------------------------------------------
 * Harvest candidates
 * ------------------------------------------------------------------------- */

export interface HarvestCandidate {
  lot: LotView;
  accountId: string;
  sleeveId: string;
  loss: number;
  status: "Clear" | "Blocked";
  conflicts: WashConflict[];
  /** First date the loss could be harvested without a wash sale. */
  eligibleOn?: string;
}

export function harvestCandidates(snap: Snapshot): HarvestCandidate[] {
  const h = snap.household;
  const out: HarvestCandidate[] = [];
  for (const sv of snap.sleeves) {
    if (sv.account.taxTreatment !== "Taxable") continue;
    for (const p of sv.positions) {
      for (const l of p.lots) {
        if (l.gain > -h.policy.harvestMinLoss) continue;
        const conflicts = recentPurchaseConflicts(h, l.securityId, l.id);
        const latest = conflicts.map((c) => c.date).sort().at(-1);
        out.push({
          lot: l,
          accountId: sv.account.id,
          sleeveId: sv.sleeve.id,
          loss: l.gain,
          status: conflicts.length ? "Blocked" : "Clear",
          conflicts,
          eligibleOn: latest ? addDays(latest, 31) : undefined,
        });
      }
    }
  }
  return out.sort((a, b) => a.loss - b.loss);
}

/* ----------------------------------------------------------------------------
 * Asset location: tax-inefficient assets sitting in taxable accounts while
 * tax-advantaged accounts hold tax-efficient equity.
 * ------------------------------------------------------------------------- */

export interface LocationFinding {
  accountId: string;
  sleeveId: string;
  securityId: string;
  value: number;
  message: string;
}

export function locationFindings(snap: Snapshot): LocationFinding[] {
  const h = snap.household;
  const out: LocationFinding[] = [];
  const shelter = snap.sleeves.filter((s) => s.account.taxTreatment === "Tax-deferred");
  const shelteredEquity = shelter.flatMap((s) => s.positions).filter((p) => p.security.taxProfile === "Efficient");
  for (const sv of snap.sleeves) {
    for (const p of sv.positions) {
      if (sv.account.taxTreatment === "Taxable" && p.security.taxProfile === "Inefficient" && shelteredEquity.length) {
        out.push({
          accountId: sv.account.id,
          sleeveId: sv.sleeve.id,
          securityId: p.security.id,
          value: p.value,
          message: `${p.security.ticker} distributes fully taxable interest in ${findAccount(h, sv.account.id).name}, while ${findAccount(h, shelter[0].account.id).name} holds tax-efficient equity that could sit in the taxable account instead.`,
        });
      }
      if (sv.account.taxTreatment !== "Taxable" && p.security.taxProfile === "Exempt") {
        out.push({
          accountId: sv.account.id,
          sleeveId: sv.sleeve.id,
          securityId: p.security.id,
          value: p.value,
          message: `${p.security.ticker} is tax-exempt but held in ${findAccount(h, sv.account.id).name}, which wastes the exemption.`,
        });
      }
    }
  }
  return out;
}

export const sleeveLabel = (h: Household, sleeveId: string) => {
  const s = findSleeve(h, sleeveId);
  return `${findAccount(h, s.accountId).name} · ${s.name}`;
};
