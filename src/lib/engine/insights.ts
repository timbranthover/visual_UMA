import { assetClassShort } from "../data/securities";
import { usd, pct } from "../format";
import { findAccount, memberFirstName, sec, type Snapshot } from "./snapshot";
import { budgetView, harvestCandidates, locationFindings } from "./tax";

const lc = (s: string) => (s.startsWith("US") ? s : s.charAt(0).toLowerCase() + s.slice(1));

export interface Insight {
  id: string;
  severity: "breach" | "warn" | "ok";
  title: string;
  detail: string;
  screen: "holdings" | "tax" | "proposal";
  cta: string;
}

/** Findings the engine derives from the household snapshot. */
export function insights(snap: Snapshot): Insight[] {
  const h = snap.household;
  const out: Insight[] = [];

  for (const e of snap.exposures.filter((x) => x.breach)) {
    const funds = [...new Set(e.sources.filter((s) => s.viaFundId).map((s) => sec(s.viaFundId!).ticker))];
    const directSleeves = e.sources.filter((s) => !s.viaFundId).length;
    out.push({
      id: "concentration",
      severity: "breach",
      title: `${e.security.ticker} is ${pct(e.pct)} of the household`,
      detail: `Held directly in ${directSleeves} SMA sleeves and through ${funds.join(" and ")}, across ${e.accountCount} accounts. Limit is ${pct(h.policy.concentrationLimit, 0)}.`,
      screen: "holdings",
      cta: "See every position",
    });
  }

  const drifted = snap.allocation.filter((a) => a.breach).sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));
  if (drifted.length) {
    const top = drifted[0];
    const fmt = (r: (typeof drifted)[number]) => `${lc(assetClassShort(r.id))} ${pct(Math.abs(r.drift))} ${r.drift > 0 ? "over" : "under"}`;
    out.push({
      id: "drift",
      severity: "breach",
      title: drifted.length === 1 ? `${assetClassShort(top.id)} is ${pct(Math.abs(top.drift))} ${top.drift > 0 ? "over" : "under"} target` : `${drifted.length} asset classes outside the ±${pct(h.policy.driftBand, 0)} band`,
      detail: `${drifted.map(fmt).join(", ").replace(/^./, (c) => c.toUpperCase())}. Only visible when every account is added up for the person.`,
      screen: "proposal",
      cta: "See the rebalance",
    });
  }

  const cands = harvestCandidates(snap);
  const clear = cands.filter((c) => c.status === "Clear");
  const blocked = cands.filter((c) => c.status === "Blocked");
  if (clear.length) {
    const owners = [...new Set(blocked.flatMap((b) => b.conflicts.map((c) => findAccount(h, c.accountId).owners)).flat())];
    out.push({
      id: "harvest",
      severity: "warn",
      title: `${usd(-clear.reduce((a, c) => a + c.loss, 0), { compact: true })} of losses can be harvested`,
      detail: blocked.length
        ? `${blocked.length} more ${blocked.length === 1 ? "lot is" : "lots are"} blocked by recent purchases in ${owners.length === 1 ? memberFirstName(h, owners[0]) + "'s" : "other"} accounts.`
        : "No conflicts with recent purchases.",
      screen: "tax",
      cta: "Review tax lots",
    });
  }

  const loc = locationFindings(snap)[0];
  if (loc) {
    out.push({
      id: "location",
      severity: "warn",
      title: `Taxable bonds sit in ${findAccount(h, loc.accountId).name}`,
      detail: `${usd(loc.value, { compact: true })} of ${sec(loc.securityId).ticker} earns fully taxable interest while the IRA holds tax-efficient equity.`,
      screen: "tax",
      cta: "See asset location",
    });
  }

  const b = budgetView(h);
  out.push({
    id: "budget",
    severity: b.remaining.LT > 0 ? "ok" : "breach",
    title: `${usd(b.remaining.LT, { compact: true })} of the 2026 long-term gain budget left`,
    detail: `${usd(b.realized.LT, { compact: true })} realized of ${usd(b.budget.LT, { compact: true })} across both taxable accounts.`,
    screen: "tax",
    cta: "Open tax view",
  });

  return out;
}
