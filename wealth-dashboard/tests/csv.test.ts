import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("writes a header row from the first object's keys", () => {
    const csv = toCsv([{ a: 1, b: "x" }]);
    expect(csv.split("\r\n")[0]).toBe("a,b");
  });

  it("quotes fields containing a comma", () => {
    const csv = toCsv([{ note: "K700, contribution" }]);
    expect(csv).toContain('"K700, contribution"');
  });

  it("escapes embedded quotes by doubling them", () => {
    const csv = toCsv([{ note: 'He said "ok"' }]);
    expect(csv).toContain('"He said ""ok"""');
  });

  it("quotes fields containing a newline", () => {
    const csv = toCsv([{ note: "line1\nline2" }]);
    expect(csv).toContain('"line1\nline2"');
  });

  it("renders null/undefined as an empty field", () => {
    const csv = toCsv([{ a: null, b: undefined }]);
    expect(csv.split("\r\n")[1]).toBe(",");
  });
});
