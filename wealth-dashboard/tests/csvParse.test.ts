import { describe, it, expect } from "vitest";
import { parseCsv, parseCsvToObjects } from "@/lib/csvParse";

describe("parseCsv", () => {
  it("parses a simple unquoted CSV", () => {
    const rows = parseCsv("a,b,c\n1,2,3");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const rows = parseCsv('date,note\n2026-09-01,"K700, contribution"');
    expect(rows[1]).toEqual(["2026-09-01", "K700, contribution"]);
  });

  it("handles doubled-quote escaping inside a quoted field", () => {
    const rows = parseCsv('note\n"He said ""ok"""');
    expect(rows[1]).toEqual(['He said "ok"']);
  });

  it("handles a newline embedded inside a quoted field", () => {
    const rows = parseCsv('note\n"line1\nline2"\nafter');
    expect(rows).toEqual([["note"], ["line1\nline2"], ["after"]]);
  });

  it("handles CRLF line endings", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n3,4");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("ignores a trailing blank line", () => {
    const rows = parseCsv("a,b\n1,2\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseCsvToObjects", () => {
  it("maps rows to header-keyed objects", () => {
    const { headers, rows } = parseCsvToObjects("date,amount\n2026-09-01,700\n2026-09-02,300");
    expect(headers).toEqual(["date", "amount"]);
    expect(rows).toEqual([
      { date: "2026-09-01", amount: "700" },
      { date: "2026-09-02", amount: "300" },
    ]);
  });

  it("fills missing trailing columns with an empty string", () => {
    const { rows } = parseCsvToObjects("a,b,c\n1,2");
    expect(rows[0]).toEqual({ a: "1", b: "2", c: "" });
  });

  it("returns empty headers/rows for empty input", () => {
    expect(parseCsvToObjects("")).toEqual({ headers: [], rows: [] });
  });
});
