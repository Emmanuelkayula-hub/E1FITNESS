import { describe, it, expect } from "vitest";
import { checkConflict } from "@/lib/calculations/conflicts";

describe("checkConflict — real Longhorn data discrepancy from the source workbooks", () => {
  it("flags the 65.59% (fact-sheet) vs 12.4% (public website) 12-month return as conflicting", () => {
    const a = { id: "a", value: "65.59", observedAt: new Date("2026-08-25") };
    const b = { id: "b", value: "12.4", observedAt: new Date("2026-09-01") };
    const result = checkConflict(a, b);
    expect(result.isConflicting).toBe(true);
    expect(result.difference?.toNumber()).toBeCloseTo(53.19, 2);
  });

  it("flags the K8.03 verified unit price vs the K1.25 example-row price as conflicting", () => {
    const a = { id: "a", value: "8.03", observedAt: new Date("2026-08-25") };
    const b = { id: "b", value: "1.25", observedAt: new Date("2026-09-01") };
    const result = checkConflict(a, b);
    expect(result.isConflicting).toBe(true);
  });

  it("does not flag two observations within 1% of each other", () => {
    const a = { id: "a", value: "100", observedAt: new Date() };
    const b = { id: "b", value: "100.5", observedAt: new Date() };
    expect(checkConflict(a, b).isConflicting).toBe(false);
  });

  it("flags non-numeric fields that differ by exact string match", () => {
    const a = { id: "a", value: "Stanbic Nominees", observedAt: new Date() };
    const b = { id: "b", value: "Standard Chartered", observedAt: new Date() };
    expect(checkConflict(a, b).isConflicting).toBe(true);
  });

  it("does not flag identical non-numeric fields", () => {
    const a = { id: "a", value: "AMG Global", observedAt: new Date() };
    const b = { id: "b", value: "AMG Global", observedAt: new Date() };
    expect(checkConflict(a, b).isConflicting).toBe(false);
  });
});
