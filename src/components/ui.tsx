"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Check, CircleSlash } from "lucide-react";
import type { Authority } from "@/lib/types";
import { AUTHORITY_SHORT } from "@/lib/engine/proposal";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ children, className, id, title, subtitle, action }: {
  children: ReactNode;
  className?: string;
  id?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section data-tour={id} className={cx("rounded-[6px] border border-line bg-white", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold tracking-[-0.005em] text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-2">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ kicker, title, children, right, tourId }: {
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
  right?: ReactNode;
  tourId?: string;
}) {
  return (
    <div data-tour={tourId} className="mb-7 flex items-end justify-between gap-6">
      <div>
        <div className="text-[12px] font-semibold tracking-[0.08em] text-red uppercase">{kicker}</div>
        <h1 className="mt-1 text-[30px] leading-tight font-light tracking-[-0.01em] text-ink">{title}</h1>
        {children && <div className="mt-2 text-[14px] text-ink-2">{children}</div>}
      </div>
      {right}
    </div>
  );
}

export function Chip({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "red" | "good" | "warn" | "dark" | "outline"; className?: string }) {
  const tones = {
    neutral: "bg-sand text-ink-2",
    red: "bg-red-tint text-red-dark",
    good: "bg-good-tint text-good",
    warn: "bg-warn-tint text-warn",
    dark: "bg-ink text-white",
    outline: "border border-line-strong text-ink-2",
  };
  return (
    <span className={cx("inline-flex h-[22px] items-center gap-1 rounded-[3px] px-2 text-[11.5px] font-semibold whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Status({ kind, children }: { kind: "ok" | "breach" | "blocked" | "warn"; children: ReactNode }) {
  const map = {
    ok: { cls: "text-good", Icon: Check },
    breach: { cls: "text-red-dark", Icon: AlertTriangle },
    warn: { cls: "text-warn", Icon: AlertTriangle },
    blocked: { cls: "text-red-dark", Icon: CircleSlash },
  }[kind];
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-[13px] font-semibold", map.cls)}>
      <map.Icon size={14} strokeWidth={2.25} />
      {children}
    </span>
  );
}

export function AuthorityTag({ a }: { a: Authority }) {
  const dot = { OVERLAY: "bg-ink", SMA_MANAGER: "bg-ink-3", FA: "bg-red", CLIENT: "bg-white border border-ink" }[a];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 whitespace-nowrap">
      <span className={cx("h-2 w-2 rounded-full", dot)} />
      {AUTHORITY_SHORT[a]}
    </span>
  );
}

export function Stat({ label, value, sub, children, tourId }: { label: string; value: ReactNode; sub?: ReactNode; children?: ReactNode; tourId?: string }) {
  return (
    <div data-tour={tourId} className="flex flex-col px-6 py-5">
      <div className="text-[12.5px] text-ink-2">{label}</div>
      <div className="num mt-1.5 text-[28px] leading-none font-light tracking-[-0.01em] text-ink">{value}</div>
      {sub && <div className="mt-2 text-[12.5px] text-ink-2">{sub}</div>}
      {children}
    </div>
  );
}

/** Horizontal meter with an optional marker. Values are fractions of max. */
export function Meter({ value, max, marker, tone = "ink", ghost }: { value: number; max: number; marker?: number; tone?: "ink" | "red"; ghost?: number }) {
  const w = (v: number) => `${Math.max(0, Math.min(1, v / max)) * 100}%`;
  return (
    <div className="relative h-2 w-full rounded-full bg-sand">
      {ghost != null && <div className="absolute inset-y-0 left-0 rounded-full bg-line-strong" style={{ width: w(ghost) }} />}
      <div className={cx("absolute inset-y-0 left-0 rounded-full", tone === "red" ? "bg-red" : "bg-ink")} style={{ width: w(value) }} />
      {marker != null && <div className="absolute -top-1 h-4 w-[2px] bg-red" style={{ left: `calc(${w(marker)} - 1px)` }} />}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, tourId }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; tourId?: string }) {
  return (
    <div data-tour={tourId} className="inline-flex rounded-[4px] border border-line-strong bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-8 rounded-[3px] px-3.5 text-[13px] font-semibold transition-colors",
            value === o.value ? "bg-ink text-white" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Th({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return <th className={cx("h-9 border-b border-line-strong px-3 text-[12px] font-semibold text-ink-2 whitespace-nowrap", right ? "text-right" : "text-left", className)}>{children}</th>;
}

export function Td({ children, className, right, colSpan }: { children?: ReactNode; className?: string; right?: boolean; colSpan?: number }) {
  return <td colSpan={colSpan} className={cx("border-b border-line px-3 py-2.5 align-middle text-[13.5px]", right && "num text-right", className)}>{children}</td>;
}

export function Gain({ v, compact }: { v: number; compact?: boolean }) {
  const a = Math.abs(v);
  const txt = compact ? (a >= 1e6 ? `$${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `$${(a / 1e3).toFixed(1)}K` : `$${a.toFixed(0)}`) : `$${Math.round(a).toLocaleString("en-US")}`;
  return <span className={cx("num", v < 0 ? "text-red-dark" : "text-ink")}>{v < 0 ? "−" : v > 0 ? "+" : ""}{txt}</span>;
}
