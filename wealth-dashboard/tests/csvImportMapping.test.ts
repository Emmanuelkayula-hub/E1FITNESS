import { describe, it, expect } from "vitest";
import { resolveColumns, normalizeHeader } from "@/lib/data/csvImport";

describe("normalizeHeader", () => {
  it("lowercases and strips spaces/underscores", () => {
    expect(normalizeHeader("Unit Price")).toBe("unitprice");
    expect(normalizeHeader("unit_price")).toBe("unitprice");
    expect(normalizeHeader("UNITPRICE")).toBe("unitprice");
  });
});

describe("resolveColumns — mapping layer, not exact-header matching (spec §50)", () => {
  it("resolves a variety of real-world header spellings", () => {
    const cols = resolveColumns(["Date", "Contribution Amount", "Unit Price", "Notes"]);
    expect(cols.get("date")).toBe("Date");
    expect(cols.get("amount")).toBe("Contribution Amount");
    expect(cols.get("unitPrice")).toBe("Unit Price");
    expect(cols.get("notes")).toBe("Notes");
  });

  it("resolves a differently-cased, underscored header set", () => {
    const cols = resolveColumns(["transaction_date", "DEPOSIT", "source"]);
    expect(cols.get("date")).toBe("transaction_date");
    expect(cols.get("amount")).toBe("DEPOSIT");
    expect(cols.get("source")).toBe("source");
  });

  it("leaves a field unresolved when no header matches", () => {
    const cols = resolveColumns(["date", "amount"]);
    expect(cols.has("unitPrice")).toBe(false);
  });
});
