"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { HOUSEHOLD } from "@/lib/data/household";
import { buildSnapshot, type Snapshot } from "@/lib/engine/snapshot";
import { applyActions, generateProposal, type Proposal } from "@/lib/engine/proposal";
import type { Household } from "@/lib/types";

export type Screen = "overview" | "holdings" | "tax" | "proposal";
export type HoldingsMode = "account" | "class" | "security";
export type HoldingsView = "current" | "after";
export type ApprovalState = "draft" | "sent";

interface AppState {
  household: Household;
  snap: Snapshot;
  proposal: Proposal;
  screen: Screen;
  setScreen: (s: Screen) => void;
  holdingsMode: HoldingsMode;
  setHoldingsMode: (m: HoldingsMode) => void;
  holdingsView: HoldingsView;
  setHoldingsView: (v: HoldingsView) => void;
  expanded: Set<string>;
  toggle: (key: string, open?: boolean) => void;
  selected: Set<string>;
  toggleAction: (id: string) => void;
  /** Household after applying the selected actions. */
  after: Snapshot;
  afterHousehold: Household;
  approval: ApprovalState;
  setApproval: (a: ApprovalState) => void;
  tourOpen: boolean;
  setTourOpen: (o: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const household = HOUSEHOLD;
  const snap = useMemo(() => buildSnapshot(household), [household]);
  const proposal = useMemo(() => generateProposal(household, snap), [household, snap]);
  const [screen, setScreenRaw] = useState<Screen>("overview");
  const [holdingsMode, setHoldingsMode] = useState<HoldingsMode>("account");
  const [holdingsView, setHoldingsView] = useState<HoldingsView>("current");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(household.accounts.map((a) => a.id)));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(proposal.actions.map((a) => a.id)));
  const [approval, setApproval] = useState<ApprovalState>("draft");
  const [tourOpen, setTourOpen] = useState(false);

  const afterHousehold = useMemo(
    () => applyActions(household, proposal.actions.filter((a) => selected.has(a.id))),
    [household, proposal, selected],
  );
  const after = useMemo(() => buildSnapshot(afterHousehold), [afterHousehold]);

  const value: AppState = {
    household,
    snap,
    proposal,
    screen,
    setScreen: (s) => {
      setScreenRaw(s);
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    },
    holdingsMode,
    setHoldingsMode,
    holdingsView,
    setHoldingsView,
    expanded,
    toggle: (key, open) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        const shouldOpen = open ?? !next.has(key);
        if (shouldOpen) next.add(key);
        else next.delete(key);
        return next;
      }),
    selected,
    toggleAction: (id) => {
      setApproval("draft");
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    after,
    afterHousehold,
    approval,
    setApproval,
    tourOpen,
    setTourOpen,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside provider");
  return c;
};
