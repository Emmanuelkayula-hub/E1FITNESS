import { describe, it, expect } from "vitest";
import {
  totalStudyHours,
  questionsPerHour,
  mockAverage,
  studyHoursPerWeek,
  daysUntilExam,
  hoursRemainingVsTarget,
} from "@/lib/calculations/studyAnalytics";

const sessions = [
  { date: new Date("2026-09-01"), hours: 2, questionsCompleted: 20, mockScorePercent: null },
  { date: new Date("2026-09-03"), hours: 3, questionsCompleted: 30, mockScorePercent: 65 },
  { date: new Date("2026-09-08"), hours: 4, questionsCompleted: 25, mockScorePercent: 72 },
];

describe("study analytics", () => {
  it("sums total hours", () => {
    expect(totalStudyHours(sessions).toNumber()).toBe(9);
  });

  it("computes questions per hour", () => {
    expect(questionsPerHour(sessions).toNumber()).toBeCloseTo(75 / 9, 4);
  });

  it("returns null mock average when no session has a score", () => {
    expect(mockAverage([sessions[0]])).toBeNull();
  });

  it("averages only scored sessions", () => {
    expect(mockAverage(sessions)?.toNumber()).toBeCloseTo((65 + 72) / 2, 4);
  });

  it("computes study hours per week over the session date span", () => {
    // span: 1 Sep to 8 Sep inclusive = 8 days = 1.14 weeks (min 1 week floor)
    const perWeek = studyHoursPerWeek(sessions);
    expect(perWeek.toNumber()).toBeCloseTo(9 / (8 / 7), 2);
  });

  it("returns zero hours per week for an empty session list", () => {
    expect(studyHoursPerWeek([]).toNumber()).toBe(0);
  });

  it("computes days until exam", () => {
    const days = daysUntilExam(new Date("2026-10-01"), new Date("2026-09-01"));
    expect(days).toBe(30);
  });

  it("returns null days-until-exam when there is no exam date", () => {
    expect(daysUntilExam(null)).toBeNull();
  });

  it("computes hours remaining vs target, allowing a negative (over-target) result", () => {
    expect(hoursRemainingVsTarget(100, 40)?.toNumber()).toBe(60);
    expect(hoursRemainingVsTarget(30, 40)?.toNumber()).toBe(-10);
  });

  it("returns null hours-remaining when there is no target set", () => {
    expect(hoursRemainingVsTarget(null, 40)).toBeNull();
  });
});
