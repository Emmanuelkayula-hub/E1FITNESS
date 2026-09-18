import { getCurrentUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";

export async function GET() {
  const user = await getCurrentUser();
  const [sessions, expenses] = await Promise.all([
    prisma.studySession.findMany({ where: { userId: user.id }, include: { exam: true }, orderBy: { date: "asc" } }),
    prisma.careerExpense.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
  ]);

  const rows = [
    ...sessions.map((s) => ({
      type: "study_session",
      date: formatDate(s.date),
      exam: s.exam?.name ?? "",
      hours: s.hours.toString(),
      questionsCompleted: s.questionsCompleted?.toString() ?? "0",
      mockScorePercent: s.mockScorePercent?.toString() ?? "",
      amount: "",
      category: "",
    })),
    ...expenses.map((e) => ({
      type: "career_expense",
      date: formatDate(e.date),
      exam: "",
      hours: "",
      questionsCompleted: "",
      mockScorePercent: "",
      amount: e.amount.toString(),
      category: e.category,
    })),
  ];

  const csv = toCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="career-data.csv"',
    },
  });
}
