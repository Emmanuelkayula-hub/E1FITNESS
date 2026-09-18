import { describe, it, expect } from "vitest";
import { formatMoney, formatUnits, formatPercent, formatDate, daysUntil } from "@/lib/format";

describe("formatMoney", () => {
  it("formats a positive value with the currency symbol first", () => {
    expect(formatMoney(1234.5)).toBe("K1,234.50");
  });

  it("puts the minus sign before the currency symbol for a negative value (regression: was 'K-395.80')", () => {
    expect(formatMoney(-395.8)).toBe("-K395.80");
  });

  it("formats zero without a sign", () => {
    expect(formatMoney(0)).toBe("K0.00");
  });

  it("returns an em dash for null/undefined", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
  });

  it("supports a non-ZMW currency prefix", () => {
    expect(formatMoney(10, "USD")).toBe("USD 10.00");
  });
});

describe("formatUnits", () => {
  it("always shows exactly 4 decimal places, even for a value with trailing zeros", () => {
    expect(formatUnits(115.5)).toBe("115.5000");
  });

  it("rounds (not truncates) beyond 4 decimals", () => {
    expect(formatUnits(33.8421055)).toBe("33.8421");
  });

  it("keeps a column of values visually aligned at the same decimal width", () => {
    expect(formatUnits(71.367368).split(".")[1].length).toBe(4);
    expect(formatUnits(115.5).split(".")[1].length).toBe(4);
  });
});

describe("formatPercent", () => {
  it("shows a leading + for a positive return by default (gain/loss context)", () => {
    expect(formatPercent(0.0275)).toBe("+2.75%");
  });

  it("shows no + for a negative return, just the minus sign", () => {
    expect(formatPercent(-0.0618)).toBe("-6.18%");
  });

  it("omits the + sign when showSign is false, for a ratio/coverage value (regression: emergency-fund coverage and plan equity-share showed a stray '+')", () => {
    expect(formatPercent(6.6, { alreadyPercent: true, showSign: false })).toBe("6.60%");
    expect(formatPercent(70, { alreadyPercent: true, showSign: false })).toBe("70.00%");
  });

  it("still shows the minus sign for a negative value even with showSign false", () => {
    expect(formatPercent(-5, { alreadyPercent: true, showSign: false })).toBe("-5.00%");
  });
});

describe("formatDate", () => {
  it("formats as DD/MM/YYYY", () => {
    expect(formatDate(new Date("2026-09-18T00:00:00Z"))).toBe("18/09/2026");
  });

  it("returns an em dash for a null/invalid date", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("daysUntil", () => {
  it("computes whole days between two dates", () => {
    expect(daysUntil(new Date("2026-10-01"), new Date("2026-09-01"))).toBe(30);
  });
});
