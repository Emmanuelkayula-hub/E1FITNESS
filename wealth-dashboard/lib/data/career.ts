import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import { writeAuditLog } from "@/lib/data/auditLog";
import type { ExamInput, StudySessionInput, CareerExpenseInput } from "@/lib/validation/career";

export async function getExamsForUser(userId: string) {
  return prisma.exam.findMany({
    where: { userId },
    include: { studySessions: { orderBy: { date: "desc" } } },
    orderBy: { examDate: "asc" },
  });
}

export async function createExam(userId: string, input: ExamInput) {
  const exam = await prisma.exam.create({
    data: {
      userId,
      name: input.name,
      sitting: input.sitting,
      examDate: input.examDate,
      registrationDeadline: input.registrationDeadline,
      studyStartDate: input.studyStartDate,
      targetStudyHours: input.targetStudyHours,
      status: input.status,
    },
  });
  await writeAuditLog({
    userId,
    action: "exam.created",
    entityType: "Exam",
    entityId: exam.id,
    newValue: { name: input.name, status: input.status },
  });
  return exam;
}

export async function createStudySession(userId: string, input: StudySessionInput) {
  const session = await prisma.studySession.create({
    data: {
      userId,
      examId: input.examId || null,
      date: input.date,
      hours: input.hours,
      questionsCompleted: input.questionsCompleted,
      topic: input.topic,
      mockScorePercent: input.mockScorePercent,
      notes: input.notes,
    },
  });
  return session;
}

export async function createCareerExpense(userId: string, input: CareerExpenseInput) {
  return prisma.careerExpense.create({
    data: {
      userId,
      date: input.date,
      category: input.category,
      amount: input.amount,
      description: input.description,
    },
  });
}

export interface CareerFinanceTradeoff {
  careerSpending: Decimal;
  investmentContributions: Decimal;
  savingsContributions: Decimal;
}

export async function getCareerFinanceTradeoff(userId: string): Promise<CareerFinanceTradeoff> {
  const [expenses, contributions, savingsDeposits] = await Promise.all([
    prisma.careerExpense.findMany({ where: { userId } }),
    prisma.contribution.findMany({ where: { userId } }),
    prisma.savingsTransaction.findMany({ where: { account: { userId }, type: "deposit" } }),
  ]);

  return {
    careerSpending: expenses.reduce((s, e) => s.plus(e.amount), new Decimal(0)),
    investmentContributions: contributions.reduce((s, c) => s.plus(c.amount), new Decimal(0)),
    savingsContributions: savingsDeposits.reduce((s, t) => s.plus(t.amount), new Decimal(0)),
  };
}
