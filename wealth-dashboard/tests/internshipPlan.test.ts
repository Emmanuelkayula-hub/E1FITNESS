import { describe, it, expect } from "vitest";
import { runMonthByMonthProjection, allocateIncome } from "@/lib/calculations/internshipPlan";

const phases = [
  { monthStart: 1, monthEnd: 4, equityAmount: 700, savingsAmount: 300 },
  { monthStart: 5, monthEnd: 8, equityAmount: 600, savingsAmount: 400 },
  { monthStart: 9, monthEnd: 12, equityAmount: 550, savingsAmount: 450 },
];

const bands = [
  { min: 100, max: 249, annualRatePercent: 3 },
  { min: 250, max: 499, annualRatePercent: 3.5 },
  { min: 500, max: 999, annualRatePercent: 4 },
  { min: 1000, max: null, annualRatePercent: 5 },
];

describe("runMonthByMonthProjection — matches internship-12-month-plan.xlsx exactly", () => {
  const rows = runMonthByMonthProjection({
    phases,
    totalMonths: 12,
    annualEquityReturnPercent: 10,
    savingsBands: bands,
  });

  it("month 1 matches Month by Month!D5:G5", () => {
    expect(rows[0].equityValue.toNumber()).toBeCloseTo(705.833333333333, 6);
    expect(rows[0].savingsValue.toNumber()).toBeCloseTo(300.875, 6);
    expect(rows[0].total.toNumber()).toBeCloseTo(1006.70833333333, 4);
    expect(rows[0].contributedToDate.toNumber()).toBe(1000);
  });

  it("month 2 matches Month by Month!D6:G6 (savings crosses into the 4% tier)", () => {
    expect(rows[1].equityValue.toNumber()).toBeCloseTo(1417.54861111111, 4);
    expect(rows[1].savingsValue.toNumber()).toBeCloseTo(602.877916666667, 4);
  });

  it("month 4->5 phase transition matches (equity drops to 600, savings rises to 400)", () => {
    expect(rows[4].equityIn.toNumber()).toBe(600);
    expect(rows[4].savingsIn.toNumber()).toBe(400);
  });

  it("month 12 total matches Month by Month!G16 (the workbook's final answer)", () => {
    expect(rows[11].equityValue.toNumber()).toBeCloseTo(7834.40459236926, 3);
    expect(rows[11].savingsValue.toNumber()).toBeCloseTo(4714.54837084807, 3);
    expect(rows[11].total.toNumber()).toBeCloseTo(12548.9529632173, 3);
    expect(rows[11].contributedToDate.toNumber()).toBe(12000);
  });
});

describe("allocateIncome — survival-first override (spec §31)", () => {
  it("splits proportionally at/above the survival threshold (matches the plan's month 1-4 ratio)", () => {
    const result = allocateIncome({ monthlyAllocable: 1000, referenceEquityShare: 0.7 });
    expect(result.rule).toBe("OK");
    expect(result.equity.toNumber()).toBe(700);
    expect(result.savings.toNumber()).toBe(300);
  });

  it("floors equity at K100 and suspends the rule below the survival threshold (matches If Income Changes!A11: K300 -> K100/K200)", () => {
    const result = allocateIncome({
      monthlyAllocable: 300,
      referenceEquityShare: 0.7,
      survivalThreshold: 400,
    });
    expect(result.rule).toBe("SURVIVAL_FIRST");
    expect(result.equity.toNumber()).toBe(100);
    expect(result.savings.toNumber()).toBe(200);
  });

  it("handles a zero allocable amount without dividing by zero", () => {
    const result = allocateIncome({ monthlyAllocable: 0, referenceEquityShare: 0.7 });
    expect(result.equity.toNumber()).toBe(0);
    expect(result.savings.toNumber()).toBe(0);
  });

  it("never allocates more to equity than the total allocable when the floor exceeds it", () => {
    const result = allocateIncome({
      monthlyAllocable: 50,
      referenceEquityShare: 0.7,
      survivalThreshold: 400,
      minimumEquityFloor: 100,
    });
    expect(result.equity.toNumber()).toBe(50);
    expect(result.savings.toNumber()).toBe(0);
  });
});
