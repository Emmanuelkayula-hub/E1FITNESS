import { describe, it, expect } from "vitest";
import {
  addMonthsClamped,
  calculateUnlockDate,
  classifyLotLiquidity,
  calculateEarlyWithdrawalEstimate,
} from "@/lib/calculations/lockIn";

describe("addMonthsClamped", () => {
  it("adds 12 months to a plain date", () => {
    const d = addMonthsClamped(new Date("2026-09-01T00:00:00Z"), 12);
    expect(d.toISOString().slice(0, 10)).toBe("2027-09-01");
  });

  it("clamps 31 Jan + 1 month to the last day of February (non-leap year)", () => {
    const d = addMonthsClamped(new Date("2027-01-31T00:00:00Z"), 1);
    expect(d.toISOString().slice(0, 10)).toBe("2027-02-28");
  });

  it("clamps 31 Jan + 1 month to 29 Feb in a leap year", () => {
    const d = addMonthsClamped(new Date("2028-01-31T00:00:00Z"), 1);
    expect(d.toISOString().slice(0, 10)).toBe("2028-02-29");
  });

  it("handles a contribution made on the last day of a 31-day month rolling into a 30-day month", () => {
    const d = addMonthsClamped(new Date("2026-08-31T00:00:00Z"), 1);
    expect(d.toISOString().slice(0, 10)).toBe("2026-09-30");
  });
});

describe("calculateUnlockDate", () => {
  const base = {
    contributionDate: new Date("2026-09-01T00:00:00Z"),
    firstInvestmentDate: new Date("2026-09-01T00:00:00Z"),
    minimumHoldingMonths: 12,
  };

  it("PER_CONTRIBUTION unlocks 12 months after the contribution itself", () => {
    const d = calculateUnlockDate({
      ...base,
      contributionDate: new Date("2026-11-01T00:00:00Z"),
      methodology: "PER_CONTRIBUTION",
    });
    expect(d?.toISOString().slice(0, 10)).toBe("2027-11-01");
  });

  it("FROM_FIRST_INVESTMENT unlocks 12 months after the first contribution regardless of this lot's date", () => {
    const d = calculateUnlockDate({
      ...base,
      contributionDate: new Date("2027-03-01T00:00:00Z"),
      firstInvestmentDate: new Date("2026-09-01T00:00:00Z"),
      methodology: "FROM_FIRST_INVESTMENT",
    });
    expect(d?.toISOString().slice(0, 10)).toBe("2027-09-01");
  });

  it("UNKNOWN methodology returns null rather than a fabricated date", () => {
    const d = calculateUnlockDate({ ...base, methodology: "UNKNOWN" });
    expect(d).toBeNull();
  });

  it("CUSTOM methodology returns null (caller supplies the date explicitly)", () => {
    const d = calculateUnlockDate({ ...base, methodology: "CUSTOM" });
    expect(d).toBeNull();
  });
});

describe("classifyLotLiquidity", () => {
  it("is UNKNOWN when unlockDate is null", () => {
    expect(classifyLotLiquidity(null, new Date())).toBe("UNKNOWN");
  });

  it("is UNLOCKED once the unlock date has passed", () => {
    const state = classifyLotLiquidity(
      new Date("2026-01-01"),
      new Date("2026-06-01")
    );
    expect(state).toBe("UNLOCKED");
  });

  it("is UNLOCKING_SOON within the 30-day window", () => {
    const state = classifyLotLiquidity(
      new Date("2026-06-20"),
      new Date("2026-06-01")
    );
    expect(state).toBe("UNLOCKING_SOON");
  });

  it("is LOCKED outside the 30-day window", () => {
    const state = classifyLotLiquidity(
      new Date("2027-01-01"),
      new Date("2026-06-01")
    );
    expect(state).toBe("LOCKED");
  });
});

describe("calculateEarlyWithdrawalEstimate", () => {
  it("applies a 5% penalty to gross value", () => {
    const est = calculateEarlyWithdrawalEstimate({
      units: 100,
      currentUnitPrice: 10,
      totalContributed: 900,
      penaltyPercent: 5,
    });
    expect(est.grossValue.toNumber()).toBe(1000);
    expect(est.penaltyAmount.toNumber()).toBe(50);
    expect(est.amountAfterPenalty.toNumber()).toBe(950);
    expect(est.gainLossBeforePenalty.toNumber()).toBe(100);
    expect(est.gainLossAfterPenalty.toNumber()).toBe(50);
  });

  it("correctly reports a loss after penalty even with a pre-penalty gain that the penalty erases", () => {
    const est = calculateEarlyWithdrawalEstimate({
      units: 100,
      currentUnitPrice: 10,
      totalContributed: 980,
      penaltyPercent: 5,
    });
    // gross=1000, gain before penalty = 20, penalty = 50 -> net loss of 30
    expect(est.gainLossBeforePenalty.toNumber()).toBe(20);
    expect(est.gainLossAfterPenalty.toNumber()).toBe(-30);
  });
});
