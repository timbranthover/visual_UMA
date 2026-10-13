import { insights } from "../src/lib/engine/insights";
import { HOUSEHOLD } from "../src/lib/data/household";
import { buildSnapshot } from "../src/lib/engine/snapshot";
import { budgetView, harvestCandidates, locationFindings } from "../src/lib/engine/tax";
import { applyActions, generateProposal, proposalRealized } from "../src/lib/engine/proposal";

const f = (n: number) => Math.round(n).toLocaleString("en-US");
const p = (n: number) => (n * 100).toFixed(1) + "%";
const s = buildSnapshot(HOUSEHOLD);
console.log("TOTAL", f(s.total));
for (const a of s.accounts) { console.log(a.account.name, f(a.value), p(a.pctOfHousehold), "gain", f(a.gain)); for (const sv of a.sleeves) console.log("   ", sv.sleeve.name, f(sv.value), p(sv.pctOfAccount), "cash", p(sv.cash/sv.value)); }
console.log("ALLOC"); for (const r of s.allocation) console.log("  ", r.id, p(r.pct), "tgt", p(r.target), "drift", p(r.drift), r.breach ? "BREACH" : "");
console.log("EXPOSURE top"); for (const e of s.exposures.slice(0, 8)) console.log("  ", e.security.ticker, f(e.total), p(e.pct), "sleeves", e.sleeveCount, "accts", e.accountCount, e.breach ? "BREACH" : "");
console.log("BUDGET", budgetView(HOUSEHOLD));
console.log("HARVEST"); for (const c of harvestCandidates(s)) console.log("  ", c.lot.securityId, c.sleeveId, f(c.loss), c.lot.term, c.status, c.eligibleOn ?? "", c.conflicts.map(x=>x.reason).join(" | "));
console.log("LOCATION", locationFindings(s).map(l => l.message));
const prop = generateProposal(HOUSEHOLD, s);
for (const a of prop.actions) { console.log("ACTION", a.id, a.title); console.log("   ", a.summary); for (const t of a.trades) console.log("     ", t.id, t.side, t.securityId, t.quantity, f(t.amount), t.sleeveId, t.realized != null ? "gain " + f(t.realized) + " " + t.term + (t.taxable ? "" : " (sheltered)") : "", t.authority, t.note ?? ""); for (const m of a.cashMoves) console.log("      MOVE", m.fromSleeveId, "->", m.toSleeveId, f(m.amount), m.authority); a.requirements.forEach(r => console.log("      REQ", r.authority, r.label)); }
console.log("GUARD", prop.guardEvents);
const r = proposalRealized(prop.actions); console.log("REALIZED", r);
const after = buildSnapshot(applyActions(HOUSEHOLD, prop.actions));
console.log("AFTER TOTAL", f(after.total), "delta", f(after.total - s.total));
for (const row of after.allocation) console.log("  ", row.id, p(row.pct), "drift", p(row.drift));
console.log("AAPL after", p(after.exposures.find(e => e.security.id==="AAPL")!.pct));
console.log("Breaches after", after.exposures.filter(e=>e.breach).map(e=>e.security.ticker+" "+p(e.pct)));
console.log("min sleeve cash", Math.min(...after.sleeves.map(x=>x.cash)).toFixed(2));
console.log("BUDGET after", budgetView(applyActions(HOUSEHOLD, prop.actions)));

// ---- Consistency assertions: every screen must agree ----
const assert = (c: boolean, m: string) => { if (!c) { console.error("FAIL:", m); process.exitCode = 1; } else console.log("ok:", m); };
for (const [label, sn] of [["current", s], ["after", after]] as const) {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
  assert(near(sn.allocation.reduce((a, r) => a + r.value, 0), sn.total), `${label}: asset classes sum to household total`);
  assert(near(sn.accounts.reduce((a, x) => a + x.value, 0), sn.total), `${label}: accounts sum to household total`);
  assert(near(sn.positions.reduce((a, p) => a + p.value, 0) + sn.sleeves.reduce((a, x) => a + x.cash, 0), sn.total), `${label}: positions + cash sum to total`);
  for (const e of sn.exposures) if (!near(e.sources.reduce((a, x) => a + x.value, 0), e.total)) assert(false, `${label}: ${e.security.ticker} sources sum`);
  assert(sn.sleeves.every((x) => x.cash >= 0), `${label}: no negative sleeve cash`);
  for (const r of sn.allocation) {
    const direct = sn.positions.filter((p) => p.security.assetClass === r.id).reduce((a, p) => a + p.value, 0) + (r.id === "CASH" ? sn.sleeves.reduce((a, x) => a + x.cash, 0) : 0);
    if (!near(direct, r.value)) assert(false, `${label}: ${r.id} class value equals its positions`);
  }
}
const ins = insights(s);
console.log("INSIGHTS"); ins.forEach(i => console.log("  ", i.severity, "|", i.title, "|", i.detail));
