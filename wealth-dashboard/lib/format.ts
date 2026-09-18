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
  return `${symbol}${d.toNumber().toLocaleString("en-ZM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatUnits(value: Numeric): string {
  const d = toDecimal(value);
  if (d === null) return "—";
  return d.toNumber().toLocaleString("en-ZM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function formatPercent(value: Numeric, opts?: { alreadyPercent?: boolean }): string {
  const d = toDecimal(value);
  if (d === null) return "—";
  const pct = opts?.alreadyPercent ? d : d.times(100);
  const sign = pct.gte(0) ? "+" : "";
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
