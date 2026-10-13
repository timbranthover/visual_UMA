"use client";

import { useEffect } from "react";
import { LayoutGrid, Layers, Landmark, ListChecks, PlayCircle } from "lucide-react";
import { AppProvider, useApp, type Screen } from "./state";
import { cx } from "./ui";
import Overview from "./screens/Overview";
import Holdings from "./screens/Holdings";
import Tax from "./screens/Tax";
import ProposalScreen from "./screens/Proposal";
import Tour from "./Tour";
import { day } from "@/lib/format";

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

const NAV: { id: Screen; label: string; Icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", Icon: LayoutGrid },
  { id: "holdings", label: "Holdings", Icon: Layers },
  { id: "tax", label: "Tax", Icon: Landmark },
  { id: "proposal", label: "Proposal", Icon: ListChecks },
];

function Shell() {
  const { screen, setScreen, household, proposal, setTourOpen, tourOpen } = useApp();

  // Offer the walkthrough on first visit.
  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem("uwv-tour-seen") === "1";
    } catch {}
    if (!seen) setTourOpen(true);
  }, [setTourOpen]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-[236px] flex-col border-r border-line bg-white">
        <div className="px-6 pt-6 pb-5">
          <div className="flex h-[26px] items-center text-[17px] leading-none font-semibold tracking-[0.2em] text-red">HALVERSTON</div>
          <div className="mt-4 text-[15px] font-semibold tracking-[-0.005em] text-ink">Unified Wealth View</div>
          <div className="text-[12px] text-ink-3">Advisor workspace</div>
        </div>

        <div className="mx-4 mb-3 rounded-[6px] bg-canvas px-3 py-3" data-tour="nav-client">
          <div className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">Client</div>
          <div className="mt-1 text-[14px] font-semibold text-ink">{household.name}</div>
          <div className="text-[12px] text-ink-2">{household.members.map((m) => m.firstName).join(" & ")} · {household.accounts.length} accounts</div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3" data-tour="nav">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setScreen(id)}
              className={cx(
                "group relative flex h-10 items-center gap-3 rounded-[4px] px-3 text-left text-[14px] transition-colors",
                screen === id ? "bg-sand font-semibold text-ink" : "text-ink-2 hover:bg-canvas hover:text-ink",
              )}
            >
              {screen === id && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r bg-red" />}
              <Icon size={17} strokeWidth={screen === id ? 2.1 : 1.8} />
              {label}
              {id === "proposal" && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red px-1.5 text-[11px] font-semibold text-white">
                  {proposal.actions.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-line px-6 py-5">
          <div className="text-[13px] font-semibold text-ink">{household.advisor.name}</div>
          <div className="text-[12px] text-ink-2">{household.advisor.title}</div>
          <div className="mt-3 text-[11px] leading-snug text-ink-3">Concept prototype with sample data. Not a system of record.</div>
        </div>
      </aside>

      <div className="pl-[236px]">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-white/90 px-10 backdrop-blur">
          <div className="text-[13px] text-ink-2">
            Clients <span className="px-1.5 text-ink-3">/</span> <span className="text-ink">{household.name}</span>
            <span className="px-1.5 text-ink-3">/</span> <span className="text-ink">{NAV.find((n) => n.id === screen)!.label}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[12.5px] text-ink-3">Sample data · priced {day(household.asOf)}</span>
            <button
              onClick={() => setTourOpen(true)}
              disabled={tourOpen}
              className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-ink px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-black disabled:opacity-40"
              data-tour="tour-button"
            >
              <PlayCircle size={15} />
              Guided walkthrough
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1280px] px-10 pt-8 pb-20" key={screen}>
          <div className="fade-in">
            {screen === "overview" && <Overview />}
            {screen === "holdings" && <Holdings />}
            {screen === "tax" && <Tax />}
            {screen === "proposal" && <ProposalScreen />}
          </div>
        </main>
      </div>

      <Tour />
    </div>
  );
}
