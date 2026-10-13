"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { useApp } from "../state";
import { Card, Gain, Meter, PageHeader, Status, Td, Th } from "../ui";
import { estTax } from "@/lib/engine/proposal";
import { findAccount, findSleeve, sec } from "@/lib/engine/snapshot";
import { budgetView, harvestCandidates, locationFindings } from "@/lib/engine/tax";
import { day, pct, qty, usd } from "@/lib/format";

export default function Tax() {
  const { household: h, snap, afterHousehold, selected, setScreen } = useApp();
  const b = budgetView(h);
  const cands = harvestCandidates(snap);
  const loc = locationFindings(snap);
  const taxNow = estTax(h, b.realized);
  const taxAfter = estTax(h, budgetView(afterHousehold).realized);
  const taxable = snap.accounts.filter((a) => a.account.taxTreatment === "Taxable");

  const unrealizedBy = (acctId: string) => {
    const lots = snap.sleeves.filter((s) => s.account.id === acctId).flatMap((s) => s.positions.flatMap((p) => p.lots));
    const sum = (term: "ST" | "LT", sign: 1 | -1) => lots.filter((l) => l.term === term && Math.sign(l.gain) === sign).reduce((a, l) => a + l.gain, 0);
    return { ltG: sum("LT", 1), ltL: sum("LT", -1), stG: sum("ST", 1), stL: sum("ST", -1) };
  };

  return (
    <>
      <PageHeader kicker="Tax" title="One tax picture for the household">
        Budgets, losses and wash-sale checks span both spouses and all {h.accounts.length} accounts, not one sleeve at a time.
      </PageHeader>

      <div className="mb-6 grid grid-cols-12 gap-6">
        <Card className="col-span-5" id="tour-budget" title="2026 gain budget" subtitle="Household budget for realized gains in taxable accounts">
          <div className="space-y-5 px-6 pb-6">
            {(["LT", "ST"] as const).map((t) => (
              <div key={t}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[13.5px] text-ink">{t === "LT" ? "Long-term" : "Short-term"}</span>
                  <span className="num text-[13.5px]">
                    <span className="text-ink">{usd(b.realized[t])}</span>
                    <span className="text-ink-3"> of {usd(b.budget[t])}</span>
                  </span>
                </div>
                <div className="mt-2"><Meter value={b.realized[t]} max={b.budget[t]} /></div>
                <div className="num mt-1.5 text-[12.5px] text-ink-2">{usd(b.remaining[t])} remaining · {pct(b.realized[t] / b.budget[t], 0)} used</div>
              </div>
            ))}
            <div className="border-t border-line pt-4">
              <div className="mb-2 text-[12px] font-semibold text-ink-2">Realized so far this year</div>
              {h.realizedYTD.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-1 text-[12.5px]">
                  <span className="text-ink-2">
                    <span className="num inline-block w-[52px] text-ink-3">{day(r.date, false)}</span>
                    <span className="font-semibold text-ink">{sec(r.securityId).ticker}</span> · {findSleeve(h, r.sleeveId).name}, {findAccount(h, r.accountId).name}
                  </span>
                  <span className="num"><span className="mr-2 text-ink-3">{r.term}</span><Gain v={r.amount} /></span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="col-span-4" title="Unrealized, taxable accounts" subtitle="By holding period, gains and losses shown separately">
          <div className="px-6 pb-6">
            {taxable.map((a) => {
              const u = unrealizedBy(a.account.id);
              return (
                <div key={a.account.id} className="border-t border-line py-3 first:border-0 first:pt-0">
                  <div className="mb-2 text-[13.5px] font-semibold text-ink">{a.account.name}</div>
                  <div className="grid grid-cols-3 gap-y-1 text-[12.5px]">
                    <span className="text-ink-3" />
                    <span className="text-right text-ink-3">Gains</span>
                    <span className="text-right text-ink-3">Losses</span>
                    <span className="text-ink-2">Long-term</span>
                    <span className="text-right"><Gain v={u.ltG} compact /></span>
                    <span className="text-right"><Gain v={u.ltL} compact /></span>
                    <span className="text-ink-2">Short-term</span>
                    <span className="text-right"><Gain v={u.stG} compact /></span>
                    <span className="text-right"><Gain v={u.stL} compact /></span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="col-span-3" title="Estimated tax on 2026 gains">
          <div className="px-6 pb-6">
            <div className="num text-[30px] leading-none font-light text-ink">{usd(taxNow)}</div>
            <div className="mt-2 text-[12.5px] leading-snug text-ink-2">
              Federal, at {pct(h.policy.taxRates.LT, 1)} long-term and {pct(h.policy.taxRates.ST, 1)} short-term, including net investment income tax.
            </div>
            <div className="mt-5 border-t border-line pt-4">
              <div className="text-[12.5px] text-ink-2">With the proposal ({selected.size} {selected.size === 1 ? "move" : "moves"} selected)</div>
              <div className="num mt-1 text-[22px] font-light text-ink">{usd(taxAfter)}</div>
              <div className="mt-1 text-[12.5px] text-ink-2">{selected.has("concentration") ? "Including the Apple trim." : "Apple trim not selected."}</div>
              <button onClick={() => setScreen("proposal")} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink hover:text-red-dark">
                Open proposal <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </Card>
      </div>

      <Card
        id="tour-harvest"
        className="mb-6 overflow-hidden"
        title="Harvest opportunities"
        subtitle={`Lots in taxable accounts with an unrealized loss over ${usd(h.policy.harvestMinLoss)}`}
        action={
          <span className="inline-flex items-center gap-2 rounded-[4px] bg-canvas px-3 py-1.5 text-[12.5px] text-ink-2">
            <ShieldCheck size={15} className="text-ink" />
            Wash-sale guard: checked against purchases in all {h.accounts.length} accounts, both spouses, including IRAs
          </span>
        }
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th className="pl-6">Security</Th>
              <Th>Account · sleeve</Th>
              <Th>Acquired</Th>
              <Th right>Quantity</Th>
              <Th right>Unrealized loss</Th>
              <Th className="pr-6">Wash-sale check</Th>
            </tr>
          </thead>
          <tbody>
            {cands.map((c) => (
              <tr key={c.lot.id} className="align-top">
                <Td className="pl-6">
                  <span className="font-semibold text-ink">{sec(c.lot.securityId).ticker}</span>
                  <span className="ml-2 text-ink-2">{sec(c.lot.securityId).name}</span>
                </Td>
                <Td className="text-ink-2">{findAccount(h, c.accountId).name} · {findSleeve(h, c.sleeveId).name}</Td>
                <Td className="num whitespace-nowrap text-ink-2">{day(c.lot.acquired)} · {c.lot.term}</Td>
                <Td right>{qty(c.lot.quantity)}</Td>
                <Td right><Gain v={c.loss} /></Td>
                <Td className="max-w-[420px] pr-6">
                  {c.status === "Clear" ? (
                    <Status kind="ok">Clear to harvest</Status>
                  ) : (
                    <div>
                      <Status kind="blocked">Blocked until {day(c.eligibleOn!, false)}</Status>
                      {c.conflicts.map((x, i) => (
                        <div key={i} className="mt-1 text-[12.5px] leading-snug text-ink-2">{x.reason}</div>
                      ))}
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card id="tour-location" title="Asset location" subtitle="Where each asset is held, given how it is taxed">
        <div className="grid grid-cols-3 gap-px border-t border-line bg-line">
          {[
            { k: "Taxable", accts: snap.accounts.filter((a) => a.account.taxTreatment === "Taxable"), best: "Tax-efficient equity, municipal bonds" },
            { k: "Tax-deferred", accts: snap.accounts.filter((a) => a.account.taxTreatment === "Tax-deferred"), best: "Taxable bonds, high-turnover strategies" },
            { k: "Tax-free", accts: snap.accounts.filter((a) => a.account.taxTreatment === "Tax-free"), best: "Highest expected growth" },
          ].map((col) => (
            <div key={col.k} className="bg-white px-6 py-5">
              <div className="text-[13.5px] font-semibold text-ink">{col.k}</div>
              <div className="text-[12.5px] text-ink-2">{col.accts.map((a) => a.account.name).join(", ")}</div>
              <div className="mt-3 text-[12px] text-ink-3">Best suited to</div>
              <div className="text-[13px] text-ink">{col.best}</div>
              <div className="mt-3 text-[12px] text-ink-3">Held today</div>
              <div className="num text-[13px] text-ink">
                {usd(col.accts.reduce((a, x) => a + x.value, 0), { compact: true })} ·{" "}
                {pct(
                  col.accts.flatMap((a) => a.sleeves.flatMap((s) => s.positions)).filter((p) => ["CORE_BOND", "MUNI"].includes(p.security.assetClass)).reduce((a, p) => a + p.value, 0) /
                    col.accts.reduce((a, x) => a + x.value, 0),
                  0,
                )}{" "}
                bonds
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-line px-6 py-4">
          {loc.map((f, i) => (
            <div key={i} className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-3">
                <Status kind="warn">{usd(f.value, { compact: true })} misplaced</Status>
                <span className="text-[13.5px] text-ink-2">{f.message}</span>
              </div>
              <button onClick={() => setScreen("proposal")} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-ink hover:text-red-dark">
                See the swap <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
