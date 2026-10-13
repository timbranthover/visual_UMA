"use client";

import { Check, ChevronRight, Clock, Lock, Send, ShieldCheck } from "lucide-react";
import { useApp } from "../state";
import { AuthorityTag, Card, Gain, PageHeader, Td, Th, cx } from "../ui";
import { assetClassShort } from "@/lib/data/securities";
import { AUTHORITY_LABEL, estTax, proposalRealized, type Action } from "@/lib/engine/proposal";
import { findAccount, findSleeve, sec } from "@/lib/engine/snapshot";
import { budgetView } from "@/lib/engine/tax";
import { day, pct, qty, usd } from "@/lib/format";
import type { Authority } from "@/lib/types";

export default function ProposalScreen() {
  const { proposal, selected } = useApp();
  const chosen = proposal.actions.filter((a) => selected.has(a.id));
  return (
    <>
      <PageHeader kicker="Proposal" title="One proposal for the whole household">
        Generated from the findings on the overview. Switch moves on or off and every number recalculates.
      </PageHeader>
      <div className="grid grid-cols-12 items-start gap-6">
        <div className="col-span-8 space-y-4" data-tour="tour-actions">
          {proposal.actions.map((a, i) => (
            <ActionCard key={a.id} a={a} n={i + 1} />
          ))}
        </div>
        <div className="sticky top-[76px] col-span-4 space-y-4">
          <Impact chosen={chosen} />
          <Approvals chosen={chosen} />
        </div>
      </div>
    </>
  );
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cx("relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors", on ? "bg-ink" : "bg-line-strong")}
    >
      <span className={cx("absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-all", on ? "left-[19px]" : "left-[3px]")} />
    </button>
  );
}

function ActionCard({ a, n }: { a: Action; n: number }) {
  const { household: h, selected, toggleAction, expanded, toggle, proposal } = useApp();
  const on = selected.has(a.id);
  const open = expanded.has(`act:${a.id}`);
  const r = proposalRealized([a]);
  const sells = a.trades.filter((t) => t.side === "Sell").reduce((x, t) => x + t.amount, 0);
  const guards = proposal.guardEvents.filter((g) => g.actionId === a.id);

  return (
    <section data-tour={`tour-action-${a.id}`} className={cx("rounded-[6px] border bg-white transition-opacity", on ? "border-line" : "border-line opacity-60")}>
      <div className="flex gap-4 px-6 pt-5 pb-4">
        <div className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand text-[13px] font-semibold text-ink">{n}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-[16px] font-semibold tracking-[-0.005em] text-ink">{a.title}</h3>
            <Switch on={on} onClick={() => toggleAction(a.id)} label={`Include ${a.title}`} />
          </div>
          <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{a.summary}</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-ink-2">
            <span><span className="num text-ink">{a.trades.length}</span> trades</span>
            <span>Sells <span className="num text-ink">{usd(sells, { compact: true })}</span></span>
            <span>Realized, taxable <span className="ml-0.5"><Gain v={r.ST + r.LT} compact /></span></span>
            <span className="flex items-center gap-3">
              {[...new Set(a.trades.map((t) => t.authority))].map((au) => <AuthorityTag key={au} a={au} />)}
            </span>
          </div>
          <ul className="mt-3 space-y-1">
            {a.rationale.map((x, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                {x}
              </li>
            ))}
          </ul>
          {guards.map((g, i) => (
            <div key={i} className="mt-3 flex gap-2.5 rounded-[4px] bg-canvas px-3 py-2.5 text-[13px] leading-snug text-ink" data-tour="tour-guard">
              <ShieldCheck size={16} className="mt-px shrink-0" />
              <span><span className="font-semibold">Wash-sale guard.</span> {g.message}</span>
            </div>
          ))}
          {a.restrictions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {a.restrictions.map((x, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-strong px-2 py-1 text-[12px] text-ink-2">
                  <Lock size={12} />
                  {x.label}{x.until ? ` until ${day(x.until, false)}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => toggle(`act:${a.id}`)}
        className="flex w-full items-center gap-2 border-t border-line px-6 py-2.5 text-[13px] font-semibold text-ink hover:bg-canvas"
      >
        <ChevronRight size={15} className={cx("text-ink-3 transition-transform", open && "rotate-90")} />
        {open ? "Hide trades" : `Show ${a.trades.length} trades${a.cashMoves.length ? ` and ${a.cashMoves.length} sleeve reallocations` : ""}`}
      </button>
      {open && (
        <div className="border-t border-line">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th className="pl-6">Trade</Th>
                <Th>Account · sleeve</Th>
                <Th right>Quantity</Th>
                <Th right>Amount</Th>
                <Th right>Realized</Th>
                <Th className="pr-6">Executed by</Th>
              </tr>
            </thead>
            <tbody>
              {a.trades.map((t) => (
                <tr key={t.id} className="align-top">
                  <Td className="pl-6">
                    <span className={cx("mr-2 inline-block w-8 text-[12px] font-semibold", t.side === "Sell" ? "text-red-dark" : "text-good")}>{t.side}</span>
                    <span className="font-semibold text-ink">{sec(t.securityId).ticker}</span>
                    {t.note && <div className="mt-0.5 pl-10 text-[12px] leading-snug text-ink-3">{t.note}</div>}
                  </Td>
                  <Td className="text-[13px] text-ink-2">{findAccount(h, t.accountId).name} · {findSleeve(h, t.sleeveId).name}</Td>
                  <Td right>{qty(t.quantity)}</Td>
                  <Td right>{usd(t.amount)}</Td>
                  <Td right>
                    {t.realized == null ? <span className="text-ink-3">—</span> : t.taxable ? <><Gain v={t.realized} /> <span className="text-[11.5px] text-ink-3">{t.term}</span></> : <span className="text-[12.5px] text-ink-3">Sheltered</span>}
                  </Td>
                  <Td className="pr-6"><AuthorityTag a={t.authority} /></Td>
                </tr>
              ))}
              {a.cashMoves.map((m, i) => (
                <tr key={`m${i}`}>
                  <Td className="pl-6">
                    <span className="mr-2 inline-block w-8 text-[12px] font-semibold text-ink-2">Move</span>
                    <span className="text-ink">Cash</span>
                  </Td>
                  <Td className="text-[13px] text-ink-2">{findAccount(h, m.accountId).name} · {findSleeve(h, m.fromSleeveId).name} → {findSleeve(h, m.toSleeveId).name}</Td>
                  <Td />
                  <Td right>{usd(m.amount)}</Td>
                  <Td right><span className="text-ink-3">—</span></Td>
                  <Td className="pr-6"><AuthorityTag a={m.authority} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Impact({ chosen }: { chosen: Action[] }) {
  const { household: h, afterHousehold, snap, after, proposal } = useApp();
  const issuer = (s: typeof snap, id: string) => s.exposures.find((e) => e.security.id === id)?.pct ?? 0;
  const breachId = snap.exposures.find((e) => e.breach)?.security.id ?? "AAPL";
  const maxDrift = (s: typeof snap) => Math.max(...s.allocation.map((a) => Math.abs(a.drift)));
  const bBefore = budgetView(h);
  const bAfter = budgetView(afterHousehold);
  const rows: { label: string; before: string; after: string; good: boolean }[] = [
    { label: `${sec(breachId).ticker} household exposure`, before: pct(issuer(snap, breachId)), after: pct(issuer(after, breachId)), good: issuer(after, breachId) <= h.policy.concentrationLimit },
    { label: "Largest allocation drift", before: pct(maxDrift(snap)), after: pct(maxDrift(after)), good: maxDrift(after) <= h.policy.driftBand },
    { label: "2026 long-term gains realized", before: usd(bBefore.realized.LT, { compact: true }), after: usd(bAfter.realized.LT, { compact: true }), good: bAfter.realized.LT <= h.policy.gainBudget.LT },
    { label: "Est. tax on 2026 gains", before: usd(estTax(h, bBefore.realized), { compact: true }), after: usd(estTax(h, bAfter.realized), { compact: true }), good: estTax(h, bAfter.realized) <= estTax(h, bBefore.realized) },
  ];
  const maxPct = Math.max(...snap.allocation.flatMap((a) => [a.pct, a.target]), ...after.allocation.map((a) => a.pct)) * 1.05;

  return (
    <Card id="tour-impact" title="Impact" subtitle={chosen.length ? `${chosen.length} of ${proposal.actions.length} moves selected · ${chosen.reduce((a, x) => a + x.trades.length, 0)} trades` : "No moves selected"}>
      <div className="px-6 pb-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-t border-line py-2.5 text-[13px]">
            <span className="text-ink-2">{r.label}</span>
            <span className="num flex items-center gap-2">
              <span className="text-ink-3">{r.before}</span>
              <span className="text-ink-3">→</span>
              <span className={cx("font-semibold", r.good ? "text-ink" : "text-red-dark")}>{r.after}</span>
              {r.good ? <Check size={13} className="text-good" strokeWidth={2.5} /> : <span className="w-[13px]" />}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-line px-6 pt-4 pb-5">
        <div className="mb-2 flex items-center justify-between text-[12px] text-ink-2">
          <span className="font-semibold">Allocation</span>
          <span className="flex gap-3">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-sm bg-line-strong" />Now</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-sm bg-ink" />After</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-[2px] bg-red" />Target</span>
          </span>
        </div>
        {snap.allocation.map((b, i) => {
          const a = after.allocation[i];
          return (
            <div key={b.id} className="grid grid-cols-[104px_1fr_44px] items-center gap-3 py-1" title={`${assetClassShort(b.id)}: ${pct(b.pct)} → ${pct(a.pct)} (target ${pct(b.target, 0)})`}>
              <span className="truncate text-[12px] text-ink-2">{assetClassShort(b.id)}</span>
              <div className="relative h-[13px]">
                <div className="absolute top-0 h-[5px] rounded-full bg-line-strong" style={{ width: `${(b.pct / maxPct) * 100}%` }} />
                <div className="absolute top-[7px] h-[5px] rounded-full bg-ink" style={{ width: `${(a.pct / maxPct) * 100}%` }} />
                <div className="absolute -top-0.5 h-[17px] w-[2px] bg-red" style={{ left: `${(b.target / maxPct) * 100}%` }} />
              </div>
              <span className="num text-right text-[12px] text-ink">{pct(a.pct)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const ORDER: Authority[] = ["FA", "OVERLAY", "CLIENT", "SMA_MANAGER"];

function Approvals({ chosen }: { chosen: Action[] }) {
  const { household: h, approval, setApproval } = useApp();
  const byAuth = ORDER.map((au) => ({
    au,
    trades: chosen.flatMap((a) => a.trades).filter((t) => t.authority === au).length + chosen.flatMap((a) => a.cashMoves).filter((m) => m.authority === au).length,
    reqs: [...new Set(chosen.flatMap((a) => a.requirements).filter((r) => r.authority === au).map((r) => r.label))],
  })).filter((g) => g.trades || g.reqs.length);
  const clients = h.members.map((m) => m.firstName).join(" and ");

  const status = (au: Authority) => {
    if (approval === "draft") return null;
    if (au === "FA") return { icon: <Check size={13} strokeWidth={2.5} />, text: `Approved by ${h.advisor.name}`, cls: "text-good" };
    if (au === "CLIENT") return { icon: <Send size={12} />, text: `Sent to ${clients} for e-signature`, cls: "text-ink" };
    return { icon: <Clock size={12} />, text: "Queued. Executes after client approval, within model rotation", cls: "text-ink-2" };
  };

  return (
    <Card id="tour-approvals" title="Approvals" subtitle="Routed to whoever holds discretion under SWP and AAP rules">
      <div className="px-6 pb-5">
        {byAuth.map((g) => {
          const st = status(g.au);
          return (
            <div key={g.au} className="border-t border-line py-3">
              <div className="flex items-center justify-between">
                <AuthorityTag a={g.au} />
                <span className="num text-[12px] text-ink-3">{g.trades} {g.trades === 1 ? "item" : "items"}</span>
              </div>
              <div className="mt-1 text-[13px] font-semibold text-ink">{AUTHORITY_LABEL[g.au]}</div>
              <ul className="mt-1 space-y-0.5">
                {g.reqs.map((r) => (
                  <li key={r} className="text-[12.5px] leading-snug text-ink-2">{r}</li>
                ))}
              </ul>
              {st && <div className={cx("mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold", st.cls)}>{st.icon}{st.text}</div>}
            </div>
          );
        })}
        {!byAuth.length && <div className="border-t border-line py-4 text-[13px] text-ink-3">Select at least one move.</div>}
        <div className="mt-2 flex items-center gap-3">
          {approval === "draft" ? (
            <button
              disabled={!chosen.length}
              onClick={() => setApproval("sent")}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[4px] bg-red text-[14px] font-semibold text-white transition-colors hover:bg-red-dark disabled:bg-line-strong"
            >
              Approve and route
            </button>
          ) : (
            <button onClick={() => setApproval("draft")} className="inline-flex h-10 flex-1 items-center justify-center rounded-[4px] border border-line-strong text-[14px] font-semibold text-ink hover:bg-canvas">
              Withdraw and edit
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
