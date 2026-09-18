import Decimal from "decimal.js";

type Numeric = Decimal.Value | Decimal | null | undefined;

function toDecimal(value: Numeric): Decimal | null {
  if (value === null || value === undefined) return null;
  const d = new Decimal(value);
  return d.isNaN() ? null : d;
}

export function formatMoney(value: Numeric, currency = "ZMW"): string {
  const d = toDecimal(value);
  if (d === null) return "—";
  const symbol = currency === "ZMW" ? "K" : `${currency} `;
  const negative = d.isNegative();
  const magnitude = d.abs().toNumber().toLocaleString("en-ZM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Sign before the currency symbol ("-K395.80"), not after it
  // ("K-395.80") — standard financial formatting.
  return `${negative ? "-" : ""}${symbol}${magnitude}`;
}

/** Fixed at 4 decimal places so a column of unit quantities lines up
 *  consistently, rather than a ragged mix (JS's default number
 *  formatting trims trailing zeros unevenly row to row). */
export function formatUnits(value: Numeric): string {
  const d = toDecimal(value);
  if (d === null) return "—";
  return d.toNumber().toLocaleString("en-ZM", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

/**
 * `showSign` controls the leading "+" on a non-negative value: on for a
 * gain/loss or return (where "+5.2%" reads as "up 5.2%"), off for a
 * ratio/coverage/share value (where "+70%" of a plan split, or "+6.6%"
 * of an emergency-fund target, reads as a stray typo rather than a
 * gain). Defaults to on since most callers are return figures.
 */
export function formatPercent(
  value: Numeric,
  opts?: { alreadyPercent?: boolean; showSign?: boolean }
): string {
  const d = toDecimal(value);
  if (d === null) return "—";
  const pct = opts?.alreadyPercent ? d : d.times(100);
  const showSign = opts?.showSign ?? true;
  const sign = showSign && pct.gte(0) ? "+" : "";
  return `${sign}${pct.toNumber().toFixed(2)}%`;
}

/** DD/MM/YYYY, per spec §45 date format setting. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function daysUntil(date: Date, from: Date = new Date()): number {
  return Math.ceil((date.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}
