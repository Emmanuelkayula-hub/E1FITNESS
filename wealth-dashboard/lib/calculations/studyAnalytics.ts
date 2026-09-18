/** Study analytics (spec §40). Pure functions over a list of study sessions. */
import Decimal from "decimal.js";

export interface StudySessionLike {
  date: Date;
  hours: Decimal.Value;
  questionsCompleted: number | null;
  mockScorePercent: Decimal.Value | null;
}

export function totalStudyHours(sessions: StudySessionLike[]): Decimal {
  return sessions.reduce((sum, s) => sum.plus(s.hours), new Decimal(0));
}

export function totalQuestionsCompleted(sessions: StudySessionLike[]): number {
  return sessions.reduce((sum, s) => sum + (s.questionsCompleted ?? 0), 0);
}

export function questionsPerHour(sessions: StudySessionLike[]): Decimal {
  const hours = totalStudyHours(sessions);
  if (hours.eq(0)) return new Decimal(0);
  return new Decimal(totalQuestionsCompleted(sessions)).dividedBy(hours);
}

export function mockAverage(sessions: StudySessionLike[]): Decimal | null {
  const scored = sessions.filter((s) => s.mockScorePercent !== null);
  if (scored.length === 0) return null;
  const sum = scored.reduce((acc, s) => acc.plus(s.mockScorePercent!), new Decimal(0));
  return sum.dividedBy(scored.length);
}

/** Hours studied per calendar week over the sessions' date range (inclusive). */
export function studyHoursPerWeek(sessions: StudySessionLike[]): Decimal {
  if (sessions.length === 0) return new Decimal(0);
  const dates = sessions.map((s) => s.date.getTime());
  const spanDays = (Math.max(...dates) - Math.min(...dates)) / (24 * 60 * 60 * 1000) + 1;
  const weeks = Decimal.max(new Decimal(spanDays).dividedBy(7), 1);
  return totalStudyHours(sessions).dividedBy(weeks);
}

export function daysUntilExam(examDate: Date | null, asOf: Date = new Date()): number | null {
  if (!examDate) return null;
  return Math.ceil((examDate.getTime() - asOf.getTime()) / (24 * 60 * 60 * 1000));
}

export function hoursRemainingVsTarget(
  targetHours: Decimal.Value | null,
  actualHours: Decimal.Value
): Decimal | null {
  if (targetHours === null) return null;
  return new Decimal(targetHours).minus(actualHours);
}
