"use client";

import { ArrowRight, AlertTriangle, Check, Info } from "lucide-react";
import { useApp } from "../state";
import { AuthorityTag, Card, Chip, Meter, PageHeader, Stat, cx } from "../ui";
import { assetClassLabel, assetClassShort } from "@/lib/data/securities";
import { insights } from "@/lib/engine/insights";
import { budgetView } from "@/lib/engine/tax";
import { day, pct, usd } from "@/lib/format";

export default function Overview() {
  const { household: h, snap, setScreen, setHoldingsMode, setHoldingsView, toggle } = useApp();
  const openClass = (id: string) => {
    setHoldingsView("current");
    setHoldingsMode("class");
    toggle(`c:${id}`, true);
    setScreen("holdings");
  };
  const taxable = snap.accounts.filter((a) => a.account.taxTreatment === "Taxable");
  const unrealized = taxable.reduce((a, x) => a + x.gain, 0);
  const b = budgetView(h);
  const found = insights(snap);
  const flags = found.filter((f) => f.severity !== "ok").length;
  const positions = snap.positions.length;
  const maxPct = Math.max(...snap.allocation.map((a) => Math.max(a.pct, a.target))) * 1.08;

  return (
    <>
      <PageHeader
        kicker="Household"
        title={h.name}
        tourId="tour-household"
        right={
          <div className="text-right text-[13px] text-ink-2">
            <div>
              Policy: <span className="text-ink">{pct(h.policy.target.US_LARGE + h.policy.target.US_SMID + h.policy.target.INTL_DEV + h.policy.target.EM, 0)} equity</span> ·
              issuer limit <span className="text-ink">{pct(h.policy.concentrationLimit, 0)}</span> · drift band <span className="text-ink">±{pct(h.policy.driftBand, 0)}</span>
            </div>
            <div className="mt-0.5">Valued {day(h.asOf)}</div>
          </div>
        }
      >
        {h.members.map((m) => `${m.name}, ${m.age}`).join("  ·  ")}
        <span className="px-2 text-ink-3">|</span>
        Advisor {h.advisor.name}
      </PageHeader>

      <Card className="mb-6 grid grid-cols-4 divide-x divide-line" id="tour-kpis">
        <Stat label="Total household assets" value={usd(snap.total, { compact: true })} sub={`${snap.accounts.length} accounts · ${snap.sleeves.length} sleeves · ${positions} positions`} />
        <Stat label="Unrealized gain, taxable accounts" value={usd(unrealized, { compact: true })} sub={taxable.map((a) => a.account.name).join(" and ")} />
        <Stat label="2026 long-term gains vs budget" value={<>{usd(b.realized.LT, { compact: true })} <span className="text-[16px] text-ink-3">of {usd(b.budget.LT, { compact: true })}</span></>}>
          <div className="mt-3"><Meter value={b.realized.LT} max={b.budget.LT} /></div>
        </Stat>
        <Stat label="Policy checks" value={<span className={flags ? "text-red" : ""}>{flags} open</span>} sub="Concentration, drift, tax and location" />
      </Card>

      <div className="mb-6 grid grid-cols-12 gap-6">
        <Card className="col-span-7" id="tour-allocation" title="Allocation vs target" subtitle={`One allocation for the person, across all ${snap.accounts.length} accounts and ${snap.sleeves.length} sleeves`}>
          <div className="px-6 pb-5">
            <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_64px_64px_70px] items-center gap-x-4 border-b border-line-strong pb-2 text-[12px] font-semibold text-ink-2">
              <div>Asset class</div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-ink" />Current</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-[2px] bg-red" />Target</span>
              </div>
              <div className="text-right">Current</div>
              <div className="text-right">Target</div>
              <div className="text-right">Drift</div>
            </div>
            {snap.allocation.map((r) => (
              <button key={r.id} onClick={() => openClass(r.id)} className="grid w-full grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_64px_64px_70px] items-center gap-x-4 border-b border-line py-[11px] text-left text-[13.5px] transition-colors hover:bg-canvas" title={`${assetClassLabel(r.id)}: ${usd(r.value)}. Open the positions behind this number.`}>
                <div className="truncate text-ink">{assetClassShort(r.id)}</div>
                <Meter value={r.pct} max={maxPct} marker={r.target} />
                <div className="num text-right text-ink">{pct(r.pct)}</div>
                <div className="num text-right text-ink-2">{pct(r.target, 0)}</div>
                <div className={cx("num text-right", r.breach ? "font-semibold text-red-dark" : "text-ink-2")}>
                  {r.breach && <AlertTriangle size={12} className="mr-1 inline -translate-y-px" />}
                  {pct(r.drift, 1, true)}
                </div>
              </button>
            ))}
            <p className="mt-4 text-[12px] leading-snug text-ink-3">Click any row to see the positions behind it. Funds count in their own asset class; issuer concentration uses fund look-through.</p>
          </div>
        </Card>

        <Card className="col-span-5" id="tour-insights" title="What the system sees" subtitle="Derived from every lot, every sleeve, every account">
          <ul className="px-3 pb-3">
            {found.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => {
                    if (f.id === "concentration") {
                      setHoldingsView("current");
                      setHoldingsMode("security");
                      toggle("x:AAPL", true);
                    }
                    setScreen(f.screen);
                  }}
                  className="group flex w-full gap-3 rounded-[4px] px-3 py-3 text-left transition-colors hover:bg-canvas"
                >
                  <span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    f.severity === "breach" ? "bg-red-tint text-red-dark" : f.severity === "warn" ? "bg-warn-tint text-warn" : "bg-good-tint text-good")}>
                    {f.severity === "ok" ? <Check size={12} strokeWidth={2.5} /> : f.severity === "warn" ? <Info size={12} strokeWidth={2.5} /> : <AlertTriangle size={11} strokeWidth={2.5} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-ink">{f.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{f.detail}</span>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink group-hover:text-red-dark">
                      {f.cta} <ArrowRight size={13} />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card id="tour-accounts" title="Accounts and sleeves" subtitle="SWP and AAP sub-accounts, each with the party that holds trading discretion">
        <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
          {snap.accounts.map((a) => (
            <div key={a.account.id} className="bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[15px] font-semibold text-ink">{a.account.name}</div>
                  <div className="mt-0.5 text-[12.5px] text-ink-2">{a.account.registration} · {a.account.number}</div>
                </div>
                <div className="text-right">
                  <div className="num text-[18px] font-light text-ink">{usd(a.value)}</div>
                  <div className="num text-[12px] text-ink-3">{pct(a.pctOfHousehold)} of household</div>
                </div>
              </div>
              <div className="mt-2 flex gap-1.5">
                <Chip tone="dark">{a.account.program}</Chip>
                <Chip tone={a.account.taxTreatment === "Taxable" ? "neutral" : "outline"}>{a.account.taxTreatment}</Chip>
              </div>
              <div className="mt-4">
                {a.sleeves.map((s) => (
                  <div key={s.sleeve.id} className="grid grid-cols-[minmax(0,1fr)_96px_90px] items-center gap-x-4 border-t border-line py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[13.5px] text-ink">
                        <span className="truncate">{s.sleeve.name}</span>
                        <Chip tone="outline" className="h-[18px] px-1.5 text-[10.5px]">{s.sleeve.kind}</Chip>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3">
                        <span>{s.sleeve.structure}</span>
                        <span>·</span>
                        <AuthorityTag a={s.sleeve.authority} />
                      </div>
                    </div>
                    <div><Meter value={s.pctOfAccount} max={1} /></div>
                    <div className="num text-right text-[13.5px] text-ink">{usd(s.value, { compact: true })}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
