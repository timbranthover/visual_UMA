export const usd = (n: number, opts: { compact?: boolean; sign?: boolean; cents?: boolean } = {}) => {
  const sign = opts.sign && n > 0 ? "+" : n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (opts.compact) {
    if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
    if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
    return `${sign}$${a.toFixed(0)}`;
  }
  return `${sign}$${a.toLocaleString("en-US", { minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 })}`;
};

export const pct = (n: number, digits = 1, sign = false) => {
  const s = sign && n > 0 ? "+" : n < 0 ? "−" : "";
  return `${s}${Math.abs(n * 100).toFixed(digits)}%`;
};

export const qty = (n: number) => n.toLocaleString("en-US");

export const day = (iso: string, withYear = true) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
