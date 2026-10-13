"use client";

import { Fragment, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { useApp } from "../state";
import { AuthorityTag, Card, Chip, Gain, PageHeader, Segmented, Status, Td, Th, cx } from "../ui";
import { assetClassLabel, assetClassShort } from "@/lib/data/securities";
import { findAccount, findSleeve, sec, type Snapshot } from "@/lib/engine/snapshot";
import { day, pct, qty, usd } from "@/lib/format";

export default function Holdings() {
  const { holdingsMode, setHoldingsMode, holdingsView, setHoldingsView, snap: current, after, selected, proposal, setScreen } = useApp();
  const [query, setQuery] = useState("");
  const [overlapOnly, setOverlapOnly] = useState(false);
  const snap = holdingsView === "after" ? after : current;
  const nMoves = proposal.actions.filter((a) => selected.has(a.id)).length;

  return (
    <>
      <PageHeader
        kicker="Holdings"
        title="Every lot, one security master"
        right={
          <Segmented
            tourId="tour-view"
            value={holdingsView}
            onChange={setHoldingsView}
            options={[
              { value: "current", label: "Current" },
              { value: "after", label: "After proposal" },
            ]}
          />
        }
      >
        {qty(snap.positions.reduce((a, p) => a + p.lots.length, 0))} tax lots in {snap.sleeves.length} sleeves resolve to {snap.exposures.length} securities and issuers.
      </PageHeader>

      {holdingsView === "after" && (
        <div className="mb-4 flex items-center justify-between rounded-[6px] border border-ink bg-white px-5 py-3 text-[13.5px]">
          <span className="text-ink">
            <span className="font-semibold">Projected holdings</span> after the {nMoves} selected proposal {nMoves === 1 ? "move" : "moves"}. Nothing has been traded.
          </span>
          <button onClick={() => setScreen("proposal")} className="text-[13px] font-semibold text-ink underline-offset-2 hover:text-red-dark hover:underline">Edit proposal</button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Segmented
          tourId="tour-mode"
          value={holdingsMode}
          onChange={setHoldingsMode}
          options={[
            { value: "account", label: "By account" },
            { value: "class", label: "By asset class" },
            { value: "security", label: "By security" },
          ]}
        />
        <label className="relative">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a security"
            className="h-9 w-[220px] rounded-[4px] border border-line-strong bg-white pr-3 pl-9 text-[13.5px] outline-none placeholder:text-ink-3 focus:border-ink"
          />
        </label>
        {holdingsMode === "security" && (
          <label className="ml-1 inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink-2 select-none">
            <input type="checkbox" checked={overlapOnly} onChange={(e) => setOverlapOnly(e.target.checked)} className="h-4 w-4 accent-[#111]" />
            Only held in 2+ sleeves
          </label>
        )}
        <div className="num ml-auto text-[13px] text-ink-2">Household total <span className="text-ink">{usd(snap.total)}</span></div>
      </div>

      {holdingsMode === "account" && <ByAccount query={query} snap={snap} />}
      {holdingsMode === "class" && <ByClass query={query} snap={snap} />}
      {holdingsMode === "security" && <BySecurity query={query} overlapOnly={overlapOnly} snap={snap} />}
    </>
  );
}

const match = (q: string, ...s: string[]) => !q || s.some((x) => x.toLowerCase().includes(q.toLowerCase()));

function Caret({ open }: { open: boolean }) {
  return <ChevronRight size={15} className={cx("shrink-0 text-ink-3 transition-transform", open && "rotate-90")} />;
}

function ByAccount({ query, snap }: { query: string; snap: Snapshot }) {
  const { expanded, toggle } = useApp();
  return (
    <Card id="tour-holdings-table" className="overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-white">
            <Th className="pl-6">Account / sleeve / position</Th>
            <Th>Discretion</Th>
            <Th right>Quantity</Th>
            <Th right>Market value</Th>
            <Th right>% of household</Th>
            <Th right>Cost basis</Th>
            <Th right className="pr-6">Unrealized</Th>
          </tr>
        </thead>
        <tbody>
          {snap.accounts.map((a) => {
            const aOpen = expanded.has(a.account.id) || !!query;
            return (
              <Fragment key={a.account.id}>
                <tr className="cursor-pointer bg-canvas hover:bg-panel" onClick={() => toggle(a.account.id)}>
                  <Td className="pl-6">
                    <span className="flex items-center gap-2">
                      <Caret open={aOpen} />
                      <span className="font-semibold text-ink">{a.account.name}</span>
                      <Chip tone="dark" className="h-[18px] px-1.5 text-[10.5px]">{a.account.program}</Chip>
                      <span className="text-[12.5px] text-ink-3">{a.account.registration} · {a.account.taxTreatment}</span>
                    </span>
                  </Td>
                  <Td />
                  <Td />
                  <Td right className="font-semibold">{usd(a.value)}</Td>
                  <Td right>{pct(a.pctOfHousehold)}</Td>
                  <Td right className="text-ink-2">{usd(a.sleeves.reduce((x, s) => x + s.positions.reduce((y, p) => y + p.cost, 0), 0))}</Td>
                  <Td right className="pr-6"><Gain v={a.gain} /></Td>
                </tr>
                {aOpen &&
                  a.sleeves.map((s) => {
                    const sOpen = expanded.has(s.sleeve.id) || !!query;
                    const rows = s.positions.filter((p) => match(query, p.security.ticker, p.security.name));
                    if (query && !rows.length) return null;
                    return (
                      <Fragment key={s.sleeve.id}>
                        <tr className="cursor-pointer hover:bg-canvas" onClick={() => toggle(s.sleeve.id)}>
                          <Td className="pl-12">
                            <span className="flex items-center gap-2">
                              <Caret open={sOpen} />
                              <span className="text-ink">{s.sleeve.name}</span>
                              <Chip tone="outline" className="h-[18px] px-1.5 text-[10.5px]">{s.sleeve.kind}</Chip>
                              <span className="text-[12.5px] text-ink-3">{s.sleeve.structure}</span>
                            </span>
                          </Td>
                          <Td><AuthorityTag a={s.sleeve.authority} /></Td>
                          <Td right className="text-ink-3">{s.positions.length} positions</Td>
                          <Td right>{usd(s.value)}</Td>
                          <Td right>{pct(s.pctOfHousehold)}</Td>
                          <Td right className="text-ink-2">{usd(s.positions.reduce((y, p) => y + p.cost, 0))}</Td>
                          <Td right className="pr-6"><Gain v={s.gain} /></Td>
                        </tr>
                        {sOpen && (
                          <>
                            {rows.map((p) => {
                              const pOpen = expanded.has(p.key);
                              return (
                                <Fragment key={p.key}>
                                  <tr className={cx("hover:bg-canvas", p.lots.length > 1 && "cursor-pointer")} onClick={() => p.lots.length > 1 && toggle(p.key)}>
                                    <Td className="pl-[76px]">
                                      <span className="flex items-center gap-2">
                                        {p.lots.length > 1 ? <Caret open={pOpen} /> : <span className="w-[15px]" />}
                                        <span className="w-[86px] shrink-0 font-semibold text-ink">{p.security.ticker}</span>
                                        <span className="truncate text-ink-2">{p.security.name}</span>
                                        <span className="shrink-0 text-[12px] text-ink-3">· {assetClassShort(p.security.assetClass)}</span>
                                        {p.lots.some((l) => l.id.startsWith("N")) && <Chip tone="dark" className="h-[18px] px-1.5 text-[10.5px]">New</Chip>}
                                      </span>
                                    </Td>
                                    <Td />
                                    <Td right>{qty(p.quantity)}</Td>
                                    <Td right>{usd(p.value)}</Td>
                                    <Td right>{pct(p.pctOfHousehold, 2)}</Td>
                                    <Td right className="text-ink-2">{usd(p.cost)}</Td>
                                    <Td right className="pr-6"><Gain v={p.gain} /></Td>
                                  </tr>
                                  {pOpen &&
                                    p.lots.map((l) => (
                                      <tr key={l.id} className="bg-canvas/60">
                                        <Td className="pl-[124px] text-[12.5px] text-ink-2">
                                          Lot acquired {day(l.acquired)} · {l.term === "LT" ? "long-term" : "short-term"}
                                        </Td>
                                        <Td />
                                        <Td right className="text-[12.5px] text-ink-2">{qty(l.quantity)}</Td>
                                        <Td right className="text-[12.5px] text-ink-2">{usd(l.value)}</Td>
                                        <Td />
                                        <Td right className="text-[12.5px] text-ink-2">{usd(l.cost)}</Td>
                                        <Td right className="pr-6 text-[12.5px]"><Gain v={l.gain} /></Td>
                                      </tr>
                                    ))}
                                </Fragment>
                              );
                            })}
                            {!query && s.cash > 0 && (
                              <tr>
                                <Td className="pl-[76px]">
                                  <span className="flex items-center gap-2">
                                    <span className="w-[15px]" />
                                    <span className="w-[86px] shrink-0 font-semibold text-ink">Cash</span>
                                    <span className="text-ink-2">Sleeve cash for trading and billing</span>
                                  </span>
                                </Td>
                                <Td />
                                <Td />
                                <Td right>{usd(s.cash)}</Td>
                                <Td right>{pct(s.cash / snap.total, 2)}</Td>
                                <Td />
                                <Td className="pr-6" />
                              </tr>
                            )}
                          </>
                        )}
                      </Fragment>
                    );
                  })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function BySecurity({ query, overlapOnly, snap }: { query: string; overlapOnly: boolean; snap: Snapshot }) {
  const { household: h, expanded, toggle } = useApp();
  const rows = snap.exposures
    .filter((e) => match(query, e.security.ticker, e.security.name))
    .filter((e) => !overlapOnly || e.sleeveCount > 1);
  const limit = h.policy.concentrationLimit;

  return (
    <Card id="tour-security-table" className="overflow-hidden">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-[190px]" />
          <col className="w-[118px]" />
          <col className="w-[118px]" />
          <col className="w-[128px]" />
          <col className="w-[96px]" />
          <col className="w-[138px]" />
        </colgroup>
        <thead>
          <tr>
            <Th className="pl-6">Security</Th>
            <Th>Held in</Th>
            <Th right>Direct</Th>
            <Th right>Through funds</Th>
            <Th right>Total exposure</Th>
            <Th right>% of household</Th>
            <Th className="pr-6">Issuer limit {pct(limit, 0)}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => {
            const key = `x:${e.security.id}`;
            const open = expanded.has(key);
            const issuer = e.security.type === "Stock" || e.security.type === "ADR";
            const tour = e.security.id === "AAPL" ? "tour-aapl" : undefined;
            return (
              <Fragment key={e.security.id}>
                <tr data-tour={tour} className={cx("cursor-pointer hover:bg-canvas", e.breach && "bg-red-tint/50 hover:bg-red-tint")} onClick={() => toggle(key)}>
                  <Td className="pl-6">
                    <span className="flex items-center gap-2">
                      <Caret open={open} />
                      <span className="w-[88px] shrink-0 truncate font-semibold text-ink" title={e.security.ticker}>{e.security.ticker}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-ink-2">{e.security.name}</span>
                        <span className="block text-[12px] text-ink-3">{assetClassShort(e.security.assetClass)}</span>
                      </span>
                    </span>
                  </Td>
                  <Td className="text-[13px] whitespace-nowrap text-ink-2">
                    {e.sleeveCount} {e.sleeveCount === 1 ? "sleeve" : "sleeves"} · {e.accountCount} {e.accountCount === 1 ? "account" : "accounts"}
                  </Td>
                  <Td right>{e.directValue ? usd(e.directValue) : <span className="text-ink-3">—</span>}</Td>
                  <Td right>{e.fundValue ? usd(e.fundValue) : <span className="text-ink-3">—</span>}</Td>
                  <Td right className="font-semibold">{usd(e.total)}</Td>
                  <Td right>{pct(e.pct, 2)}</Td>
                  <Td className="pr-6 whitespace-nowrap">
                    {!issuer ? <span className="text-[12.5px] text-ink-3">Fund or bond</span> : e.breach ? <Status kind="breach">Over limit</Status> : <Status kind="ok">Within</Status>}
                  </Td>
                </tr>
                {open &&
                  e.sources.map((s, i) => {
                    const sl = findSleeve(h, s.sleeveId);
                    const acct = findAccount(h, s.accountId);
                    return (
                      <tr key={i} data-tour={tour} className="bg-canvas/60">
                        <Td className="pl-[60px] text-[13px]">
                          <span className="block truncate">
                            <span className="text-ink">{acct.name}</span>
                            <span className="text-ink-3"> · </span>
                            <span className="text-ink-2">{sl.name}</span>
                          </span>
                          <span className="block text-[12px] text-ink-3">{acct.program} · {acct.taxTreatment}</span>
                        </Td>
                        <Td className="text-[12.5px] whitespace-nowrap text-ink-2">
                          {s.viaFundId ? (
                            <>Inside {sec(s.viaFundId).ticker} · {pct(sec(s.viaFundId).lookThrough!.find((c) => c.securityId === e.security.id)!.weight, 1)} weight</>
                          ) : (
                            <>Direct · {qty(s.quantity!)} {e.security.type === "Municipal bond" ? "bonds" : "shares"}</>
                          )}
                        </Td>
                        <Td right className="text-[12.5px]">{s.viaFundId ? "" : usd(s.value)}</Td>
                        <Td right className="text-[12.5px]">{s.viaFundId ? usd(s.value) : ""}</Td>
                        <Td />
                        <Td right className="text-[12.5px] text-ink-2">{pct(s.value / snap.total, 2)}</Td>
                        <Td className="pr-6"><AuthorityTag a={sl.authority} /></Td>
                      </tr>
                    );
                  })}
              </Fragment>
            );
          })}
          {!rows.length && (
            <tr><Td colSpan={7} className="py-10 text-center text-ink-3">No securities match.</Td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

function ByClass({ query, snap }: { query: string; snap: Snapshot }) {
  const { household: h, expanded, toggle } = useApp();
  return (
    <Card id="tour-class-table" className="overflow-hidden">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col />
          <col className="w-[300px]" />
          <col className="w-[140px]" />
          <col className="w-[120px]" />
          <col className="w-[90px]" />
          <col className="w-[110px]" />
        </colgroup>
        <thead>
          <tr>
            <Th className="pl-6">Asset class / position</Th>
            <Th>Account · sleeve</Th>
            <Th right>Market value</Th>
            <Th right>% of household</Th>
            <Th right>Target</Th>
            <Th right className="pr-6">Drift</Th>
          </tr>
        </thead>
        <tbody>
          {snap.allocation.map((r) => {
            const key = `c:${r.id}`;
            const positions = snap.positions.filter((p) => p.security.assetClass === r.id && match(query, p.security.ticker, p.security.name)).sort((a, b) => b.value - a.value);
            const cashSleeves = r.id === "CASH" ? snap.sleeves.filter((s) => s.cash > 0).sort((a, b) => b.cash - a.cash) : [];
            if (query && !positions.length) return null;
            const open = expanded.has(key) || !!query;
            return (
              <Fragment key={r.id}>
                <tr className={cx("cursor-pointer", r.breach ? "bg-red-tint/50 hover:bg-red-tint" : "bg-canvas hover:bg-panel")} onClick={() => toggle(key)}>
                  <Td className="pl-6">
                    <span className="flex items-center gap-2">
                      <Caret open={open} />
                      <span className="font-semibold text-ink">{assetClassLabel(r.id)}</span>
                      <span className="text-[12.5px] text-ink-3">{r.id === "CASH" ? `${cashSleeves.length} sleeves` : `${positions.length} positions`}</span>
                    </span>
                  </Td>
                  <Td />
                  <Td right className="font-semibold">{usd(r.value)}</Td>
                  <Td right>{pct(r.pct)}</Td>
                  <Td right className="text-ink-2">{pct(r.target, 0)}</Td>
                  <Td right className={cx("pr-6", r.breach ? "font-semibold text-red-dark" : "text-ink-2")}>{pct(r.drift, 1, true)}</Td>
                </tr>
                {open &&
                  positions.map((p) => (
                    <tr key={p.key}>
                      <Td className="pl-12">
                        <span className="flex items-center gap-2">
                          <span className="w-[88px] shrink-0 truncate font-semibold text-ink">{p.security.ticker}</span>
                          <span className="truncate text-ink-2">{p.security.name}</span>
                        </span>
                      </Td>
                      <Td className="truncate text-[13px] text-ink-2">{findAccount(h, p.accountId).name} · {findSleeve(h, p.sleeveId).name}</Td>
                      <Td right>{usd(p.value)}</Td>
                      <Td right className="text-ink-2">{pct(p.pctOfHousehold, 2)}</Td>
                      <Td />
                      <Td className="pr-6" />
                    </tr>
                  ))}
                {open &&
                  cashSleeves.map((s) => (
                    <tr key={s.sleeve.id}>
                      <Td className="pl-12 text-ink">Sleeve cash</Td>
                      <Td className="truncate text-[13px] text-ink-2">{s.account.name} · {s.sleeve.name}</Td>
                      <Td right>{usd(s.cash)}</Td>
                      <Td right className="text-ink-2">{pct(s.cash / snap.total, 2)}</Td>
                      <Td />
                      <Td className="pr-6" />
                    </tr>
                  ))}
              </Fragment>
            );
          })}
          {!query && (
            <tr>
              <Td className="pl-6 font-semibold">Household</Td>
              <Td />
              <Td right className="font-semibold">{usd(snap.total)}</Td>
              <Td right className="font-semibold">{pct(snap.allocation.reduce((a, r) => a + r.pct, 0))}</Td>
              <Td right className="text-ink-2">{pct(snap.allocation.reduce((a, r) => a + r.target, 0), 0)}</Td>
              <Td className="pr-6" />
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
