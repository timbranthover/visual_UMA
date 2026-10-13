"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useApp, type HoldingsMode, type Screen } from "./state";
import { cx } from "./ui";
import { harvestCandidates } from "@/lib/engine/tax";
import { proposalRealized } from "@/lib/engine/proposal";
import { pct, usd } from "@/lib/format";

interface Step {
  title: string;
  body: ReactNode;
  /** data-tour id to spotlight. Omit for a centered step. */
  target?: string;
  screen?: Screen;
  mode?: HoldingsMode;
  view?: "current" | "after";
  open?: string[];
  close?: string[];
  wide?: boolean;
  /** Float the card over one side of a full-width spotlight instead of beside it. */
  inside?: "left" | "right";
}

/* ----------------------------------------------------------------------------
 * Small presentational helpers inside the walkthrough card
 * ------------------------------------------------------------------------- */

const P = ({ children }: { children: ReactNode }) => <p className="mt-2.5 text-[14px] leading-[1.55] text-[#d9d7cf]">{children}</p>;
const B = ({ children }: { children: ReactNode }) => <span className="font-semibold text-white">{children}</span>;
const Note = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mt-3.5 rounded-[6px] border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-[13px] leading-[1.5] text-[#cfcdc4]">
    <span className="mr-1.5 text-[11px] font-semibold tracking-[0.08em] text-[#ff5a52] uppercase">{label}</span>
    {children}
  </div>
);

function Hierarchy() {
  const rows = [
    ["Household", "Members, target allocation, gain budget, issuer limit"],
    ["Accounts", "Registration, tax treatment, program: SWP or AAP"],
    ["Sleeves", "SMA or fund sub-accounts, each with a discretion holder"],
    ["Tax lots", "Quantity, cost, acquisition date"],
    ["Security master", "One record per security, with fund look-through"],
  ];
  return (
    <div className="mt-4 space-y-1.5">
      {rows.map(([k, v], i) => (
        <div key={k} className="flex items-center gap-3" style={{ paddingLeft: i * 18 }}>
          <span className="flex h-6 shrink-0 items-center rounded-[4px] bg-white px-2 text-[12px] font-semibold text-[#141414]">{k}</span>
          <span className="text-[12.5px] text-[#bdbbb2]">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Pipes() {
  const items = [
    ["Sleeve-level data in firm systems", "Lots, cash and models for every SWP / AAP sub-account, fed from the trading platform and overlay into firm records, so advisors, reporting and billing see the same thing."],
    ["One security master with look-through", "Every holding maps to one record; funds carry constituents. That is what turns 'four positions' into 'one Apple exposure'."],
    ["Household policy objects", "Target, gain budget and restrictions stored once at the person level and consumed by the overlay, not re-keyed per sleeve."],
    ["Premium tax management as the service", "Halverston AM already prices PTM at 3–20 bps per the ADV. Extending it across sleeves and accounts is the product."],
    ["Routing that respects discretion", "Proposals go to the overlay, the FA or the client according to SWP and AAP rules, with e-signature for client approvals."],
  ];
  return (
    <ol className="mt-4 space-y-3">
      {items.map(([k, v], i) => (
        <li key={k} className="flex gap-3">
          <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/30 text-[12px] font-semibold text-white">{i + 1}</span>
          <span>
            <span className="block text-[14px] font-semibold text-white">{k}</span>
            <span className="block text-[13px] leading-[1.5] text-[#bdbbb2]">{v}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ----------------------------------------------------------------------------
 * Tour
 * ------------------------------------------------------------------------- */

export default function Tour() {
  const app = useApp();
  const { tourOpen, setTourOpen, setScreen, setHoldingsMode, setHoldingsView, after, toggle, snap, household: h, proposal, setApproval } = app;
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps: Step[] = useMemo(() => {
    const aapl = snap.exposures.find((e) => e.security.id === "AAPL")!;
    const usLarge = snap.allocation.find((a) => a.id === "US_LARGE")!;
    const cands = harvestCandidates(snap);
    const clear = cands.filter((c) => c.status === "Clear");
    const blocked = cands.filter((c) => c.status === "Blocked");
    const r = proposalRealized(proposal.actions);
    return [
      {
        title: "A connected UMA, through the advisor's eyes",
        wide: true,
        screen: "overview",
        body: (
          <>
            <P>
              This is a working concept of what Strategic Wealth Portfolio and Advisor Allocation Program clients could look like when every sleeve is visible to the firm&apos;s systems.
              The client is a sample household: <B>{h.members.map((m) => m.firstName).join(" and ")} Whitfield, {usd(snap.total, { compact: true })} across {h.accounts.length} accounts and {snap.sleeves.length} sleeves</B>.
            </P>
            <P>Nothing on screen is typed in. Every figure is calculated live from individual tax lots using this data model:</P>
            <Hierarchy />
            <Note label="How to read">Use the arrow keys or the buttons. The walkthrough drives the app; you can leave it at any point and click around.</Note>
          </>
        ),
      },
      {
        title: "Start from the person, not the account",
        target: "tour-household",
        screen: "overview",
        body: (
          <>
            <P>The household is the top of the model. Policy lives here once: <B>target allocation, a {pct(h.policy.concentrationLimit, 0)} single-issuer limit, a ±{pct(h.policy.driftBand, 0)} drift band and a calendar-year gain budget</B>.</P>
            <Note label="Today">SWP and AAP are UMAs on paper, but core systems stop at the account. Nobody, the advisor included, can see the sleeves add up to one picture.</Note>
          </>
        ),
      },
      {
        title: "The numbers roll up from every lot",
        target: "tour-kpis",
        screen: "overview",
        body: (
          <P>
            Totals, unrealized gains and the gain budget are aggregated from <B>{snap.positions.reduce((a, p) => a + p.lots.length, 0)} tax lots</B> across both spouses&apos; taxable accounts and both IRAs.
            The budget counts only taxable accounts, as it should.
          </P>
        ),
      },
      {
        title: "One allocation for the whole client",
        target: "tour-allocation",
        screen: "overview",
        body: (
          <>
            <P>SMA sleeves, ETFs, individual munis and sleeve cash, combined into one person-level allocation and compared with one target.</P>
            <P>US large cap is <B>{pct(usLarge.drift)} over target</B>. Each account looks reasonable on its own; only the household view shows the drift.</P>
            <P>Every row is clickable and opens the exact positions that add up to it.</P>
          </>
        ),
      },
      {
        title: "Sleeves are first-class, with discretion attached",
        target: "tour-accounts",
        screen: "overview",
        body: (
          <>
            <P>Each sub-account shows its structure and who may trade it, following the program rules in the firm&apos;s Form ADV:</P>
            <ul className="mt-2 space-y-1 text-[13px] leading-[1.5] text-[#d9d7cf]">
              <li><B>Overlay:</B> Model Delivery SMA sleeves, traded by Halverston AM</li>
              <li><B>SMA manager:</B> the manager-traded municipal sleeve</li>
              <li><B>Advisor:</B> fund and ETF sleeves in AAP</li>
              <li><B>Client:</B> fund and ETF sleeves in SWP, authorized trade by trade</li>
            </ul>
          </>
        ),
      },
      {
        title: "The system notices what no single manager can",
        target: "tour-insights",
        screen: "overview",
        body: (
          <P>These findings are derived by the engine, not written by hand. Each one links to its evidence. We&apos;ll follow them in order: concentration, tax, then the proposal that resolves them.</P>
        ),
      },
      {
        title: "Drill from person to tax lot",
        target: "tour-holdings-table",
        inside: "right",
        screen: "holdings",
        mode: "account",
        open: ["A1", "S1", "S1:AAPL"],
        body: (
          <P>Household → account → sleeve → position → lot. Apple in the Joint account&apos;s growth sleeve opens into its two lots, bought in 2016 and 2021, each with its own cost and holding period.</P>
        ),
      },
      {
        title: "The clash, resolved",
        target: "tour-aapl",
        screen: "holdings",
        mode: "security",
        open: ["x:AAPL"],
        body: (
          <>
            <P>Switch to <B>By security</B> and the same Apple shows up in {aapl.sleeveCount} sleeves across {aapl.accountCount} accounts: directly in two SMA sleeves, and inside VOO and QQQ.</P>
            <P>Combined, it is <B>{pct(aapl.pct)} of the household</B> against a {pct(h.policy.concentrationLimit, 0)} limit.</P>
            <Note label="Today">Each SMA manager sees only its own sleeve, so each thinks its Apple position is fine.</Note>
          </>
        ),
      },
      {
        title: "A gain budget that spans accounts",
        target: "tour-budget",
        screen: "tax",
        body: (
          <>
            <P>Realized gains from every taxable sleeve count against one household budget. The overlay can work within it rather than each sleeve trading blind.</P>
            <Note label="Benchmark">Morgan Stanley Select UMA lets clients cap realized gains within a single UMA account. This applies the same idea across all of a household&apos;s accounts.</Note>
          </>
        ),
      },
      {
        title: "A wash-sale guard across the household",
        target: "tour-harvest",
        inside: "left",
        screen: "tax",
        body: (
          <>
            <P><B>{clear.length} lots</B> are clear to harvest. <B>{blocked.length}</B> are blocked, and every conflict sits in another sleeve or account:</P>
            <ul className="mt-2 space-y-1 text-[13px] leading-[1.5] text-[#d9d7cf]">
              <li><B>UNH, two lots:</B> Claire&apos;s dividend sleeve bought shares on Sep 24.</li>
              <li><B>VWO:</B> Claire&apos;s Roth IRA bought on Oct 1. Inside an IRA the loss would be lost permanently.</li>
            </ul>
            <P>Spouses and IRAs count for wash sales. Only a household view can catch this.</P>
          </>
        ),
      },
      {
        title: "Asset location",
        target: "tour-location",
        screen: "tax",
        body: <P>Taxable bonds sit in the joint taxable account while the IRA holds tax-efficient index equity. Swapping them keeps the same risk and lowers the annual tax drag.</P>,
      },
      {
        title: "One proposal, three moves",
        target: "tour-actions",
        screen: "proposal",
        open: ["act:location"],
        body: (
          <>
            <P><B>1.</B> Trim Apple from the highest-cost lots first and block repurchases in every sleeve. <B>2.</B> Harvest losses so the trim costs no net tax. <B>3.</B> Swap bonds into the IRA and fix the international gap.</P>
            <P>Switch any move off and every number recalculates.</P>
            <Note label="Guard">The engine caught its own mistake. Buying AGG in the IRA would have washed the AGG loss in the joint account, so it bought a different bond fund instead.</Note>
          </>
        ),
      },
      {
        title: "Before and after",
        target: "tour-impact",
        screen: "proposal",
        body: (
          <P>
            Apple drops under the limit, drift falls inside the band, and realized taxable gains net to <B>{usd(r.ST + r.LT, { compact: true, sign: true })}</B> for the proposal, so 2026 long-term gains fall instead of rising.
          </P>
        ),
      },
      {
        title: "Routed to whoever holds discretion",
        target: "tour-approvals",
        screen: "proposal",
        body: (
          <>
            <P>The system proposes; it does not override program rules. Overlay trades go to Halverston AM, AAP fund trades to the advisor, and SWP changes plus the household restriction to the clients for e-signature.</P>
            <P>Try <B>Approve and route</B> after the walkthrough.</P>
          </>
        ),
      },
      {
        title: "See it land in the holdings",
        target: "tour-aapl",
        screen: "holdings",
        mode: "security",
        view: "after",
        open: ["x:AAPL"],
        body: (
          <>
            <P>Holdings now shows the projected after-state. Apple is <B>{pct(after.exposures.find((e) => e.security.id === "AAPL")?.pct ?? 0)}</B> of the household, back within the limit. Claire&apos;s dividend sleeve no longer holds it, and the Joint growth sleeve keeps only its lowest-cost shares.</P>
            <P>The same engine powers every screen, so the overview, holdings, tax view and proposal always agree.</P>
          </>
        ),
      },
      {
        title: "What it takes to make this real",
        wide: true,
        screen: "overview",
        body: (
          <>
            <P>The screens are the easy part. The value comes from the plumbing underneath:</P>
            <Pipes />
            <Note label="Next">Explore freely. Restart the walkthrough any time from the top bar.</Note>
          </>
        ),
      },
    ];
  }, [snap, h, proposal, after]);

  const step = steps[i];

  const close = useCallback(() => {
    try {
      window.localStorage.setItem("uwv-tour-seen", "1");
    } catch {}
    setTourOpen(false);
    setI(0);
  }, [setTourOpen]);

  // Drive the app to the state each step needs.
  useEffect(() => {
    if (!tourOpen) return;
    if (step.screen) setScreen(step.screen);
    if (step.mode) setHoldingsMode(step.mode);
    if (step.screen === "holdings") setHoldingsView(step.view ?? "current");
    step.open?.forEach((k) => toggle(k, true));
    step.close?.forEach((k) => toggle(k, false));
    if (step.screen === "proposal") setApproval("draft");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, tourOpen]);

  // Measure the spotlight target once the screen has rendered.
  useLayoutEffect(() => {
    if (!tourOpen) return;
    let raf = 0;
    let tries = 0;
    const measure = (scroll: boolean) => {
      if (!step.target) return setRect(null);
      const els = [...document.querySelectorAll(`[data-tour="${step.target}"]`)] as HTMLElement[];
      if (!els.length) {
        if (tries++ < 30) raf = requestAnimationFrame(() => measure(scroll));
        return;
      }
      const union = () => {
        const rs = els.map((e) => e.getBoundingClientRect());
        const left = Math.min(...rs.map((r) => r.left));
        const top = Math.min(...rs.map((r) => r.top));
        const right = Math.max(...rs.map((r) => r.right));
        const bottom = Math.max(...rs.map((r) => r.bottom));
        return new DOMRect(left, top, right - left, bottom - top);
      };
      if (scroll) {
        const r = union();
        // Short targets sit near the top so the card fits below; tall ones are centred.
        const offset = r.height + 400 < window.innerHeight - 96 ? 96 : Math.max(80, (window.innerHeight - Math.min(r.height, window.innerHeight - 160)) / 2);
        const top = window.scrollY + r.top - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        setTimeout(() => setRect(union()), 380);
      }
      setRect(union());
    };
    const t = setTimeout(() => measure(true), 60);
    const onMove = () => measure(false);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
    };
  }, [i, tourOpen, step.target]);

  useEffect(() => {
    if (!tourOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourOpen, steps.length, close]);

  if (!tourOpen) return null;

  const pad = 8;
  const spot = step.target && rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;

  // Card placement: beside the spotlight where there is room, otherwise below or above.
  const W = step.wide ? 620 : 380;
  let cardStyle: React.CSSProperties;
  if (!spot) {
    cardStyle = { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: W };
  } else if (step.inside) {
    const vh = window.innerHeight;
    const top = clamp(spot.top + 64, 16, vh - 380);
    cardStyle = step.inside === "left" ? { left: spot.left + 24, top, width: W } : { left: spot.left + spot.width - W - 24, top, width: W };
  } else {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 18;
    const estH = 380;
    if (spot.left + spot.width + gap + W < vw - 16) {
      cardStyle = { left: spot.left + spot.width + gap, top: clamp(spot.top, 16, vh - estH - 16), width: W };
    } else if (spot.left - gap - W > 16) {
      cardStyle = { left: spot.left - gap - W, top: clamp(spot.top, 16, vh - estH - 16), width: W };
    } else if (spot.top + spot.height + gap + estH < vh) {
      cardStyle = { left: clamp(spot.left, 16, vw - W - 16), top: spot.top + spot.height + gap, width: W };
    } else {
      cardStyle = { left: clamp(spot.left + spot.width - W, 16, vw - W - 16), top: Math.max(16, spot.top - gap - estH), width: W };
    }
  }

  return (
    <div className="fixed inset-0 z-50" aria-live="polite">
      {/* Backdrop / spotlight */}
      {spot ? (
        <div
          className="pointer-events-none fixed rounded-[10px] ring-2 ring-[#ff3b30] transition-all duration-300 ease-out"
          style={{ ...spot, boxShadow: "0 0 0 9999px rgba(10,10,10,0.64)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(10,10,10,0.72)]" />
      )}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Card */}
      <div
        role="dialog"
        aria-label="Guided walkthrough"
        className="fixed rounded-[12px] bg-[#141414] p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] transition-[left,top] duration-300 ease-out"
        style={cardStyle}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-[#ff5a52] uppercase">Guided walkthrough</span>
          <div className="flex items-center gap-3">
            <span className="num text-[12px] text-[#9a988f]">{String(i + 1).padStart(2, "0")} / {steps.length}</span>
            <button onClick={close} aria-label="Close walkthrough" className="text-[#9a988f] hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-1">
          {steps.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Step ${k + 1}`} className={cx("h-[3px] flex-1 rounded-full transition-colors", k <= i ? "bg-[#ff3b30]" : "bg-white/15")} />
          ))}
        </div>
        <h3 className="mt-4 text-[20px] leading-snug font-semibold tracking-[-0.01em]">{step.title}</h3>
        <div className={cx(step.wide && "max-h-[60vh] overflow-y-auto pr-1 scroll-thin")}>{step.body}</div>
        <div className="mt-5 flex items-center justify-between">
          <button onClick={close} className="text-[13px] text-[#9a988f] hover:text-white">
            {i === steps.length - 1 ? "Close" : "Skip walkthrough"}
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-white/20 px-3 text-[13px] font-semibold text-white hover:bg-white/10">
                <ArrowLeft size={14} /> Back
              </button>
            )}
            {i < steps.length - 1 ? (
              <button onClick={() => setI(i + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-[#e60000] px-4 text-[13px] font-semibold text-white hover:bg-[#bd000c]">
                {i === 0 ? "Start" : "Next"} <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={close} className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-[#e60000] px-4 text-[13px] font-semibold text-white hover:bg-[#bd000c]">
                Explore the app
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
