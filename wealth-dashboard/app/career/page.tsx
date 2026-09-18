import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { getExamsForUser, getCareerFinanceTradeoff } from "@/lib/data/career";
import { ratesToBands } from "@/lib/data/savings";
import { runMonthByMonthProjection } from "@/lib/calculations/internshipPlan";
import {
  totalStudyHours,
  questionsPerHour,
  mockAverage,
  daysUntilExam,
  hoursRemainingVsTarget,
} from "@/lib/calculations/studyAnalytics";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ExamForm } from "@/components/career/ExamForm";
import { StudySessionForm } from "@/components/career/StudySessionForm";
import { CareerExpenseForm } from "@/components/career/CareerExpenseForm";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  STUDYING: "Studying",
  REVISION: "Revision",
  MOCK_EXAMS: "Mock exams",
  COMPLETED: "Completed",
  PASSED: "Passed",
  DEFERRED: "Deferred",
};

export default async function CareerPage() {
  const user = await getCurrentUser();
  const exams = await getExamsForUser(user.id);
  const tradeoff = await getCareerFinanceTradeoff(user.id);

  const plan = await prisma.contributionPlan.findFirst({
    where: { userId: user.id, active: true },
    include: { phases: { orderBy: { monthStart: "asc" } } },
  });
  const savingsAccount = await prisma.savingsAccount.findFirst({ where: { userId: user.id } });
  const savingsRates = savingsAccount
    ? await prisma.savingsRate.findMany({ where: { accountId: savingsAccount.id } })
    : [];

  const timeline =
    plan && savingsRates.length > 0
      ? runMonthByMonthProjection({
          phases: plan.phases.map((p) => ({
            monthStart: p.monthStart,
            monthEnd: p.monthEnd,
            equityAmount: p.equityAmount,
            savingsAmount: p.savingsAmount,
          })),
          totalMonths: 12,
          annualEquityReturnPercent: 10,
          savingsBands: ratesToBands(savingsRates),
        })
      : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Career</h1>
        <p className="text-sm text-muted">
          {user.careerProfile?.qualification} · {user.careerProfile?.institution}
          {user.careerProfile?.graduationDate && ` · graduated ${formatDate(user.careerProfile.graduationDate)}`}
        </p>
      </div>

      <Card>
        <CardHeader
          title="Internship"
          subtitle={
            user.careerProfile?.internshipStartDate
              ? `Started ${formatDate(user.careerProfile.internshipStartDate)}, ${user.careerProfile.internshipMonths} months`
              : undefined
          }
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile label="Employer" value={user.careerProfile?.currentEmployer ?? "—"} />
          <StatTile label="Role" value={user.careerProfile?.currentRole ?? "—"} />
          <StatTile label="Department" value={user.careerProfile?.department ?? "—"} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Actuarial exam tracker" />
        <div className="mb-4 space-y-4">
          {exams.map((exam) => {
            const hours = totalStudyHours(exam.studySessions);
            const days = daysUntilExam(exam.examDate);
            const remaining = hoursRemainingVsTarget(exam.targetStudyHours, hours);
            const avg = mockAverage(exam.studySessions);
            return (
              <div key={exam.id} className="border-b border-border pb-4 last:border-none last:pb-0">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{exam.name}</h3>
                  <Badge tone="userInput">{STATUS_LABEL[exam.status]}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <StatTile label="Days until exam" value={days !== null ? String(days) : "—"} />
                  <StatTile label="Study hours logged" value={hours.toNumber().toFixed(1)} />
                  <StatTile
                    label="Hours vs target"
                    value={remaining !== null ? remaining.toNumber().toFixed(1) : "—"}
                    sub={remaining !== null ? "remaining" : "no target set"}
                  />
                  <StatTile label="Questions/hour" value={questionsPerHour(exam.studySessions).toFixed(2)} />
                  <StatTile label="Mock average" value={avg ? `${avg.toFixed(1)}%` : "—"} />
                </div>
              </div>
            );
          })}
          {exams.length === 0 && <p className="text-sm text-muted">No exams tracked yet.</p>}
        </div>
        <ExamForm />
      </Card>

      <Card>
        <CardHeader title="Log a study session" />
        <StudySessionForm exams={exams.map((e) => ({ id: e.id, name: e.name }))} />
      </Card>

      <Card>
        <CardHeader title="Career vs. financial allocation" subtitle="Financial allocation overview — not a ranking of one over the other." />
        <div className="grid grid-cols-3 gap-4">
          <StatTile label="Career spending" value={formatMoney(tradeoff.careerSpending.toString())} />
          <StatTile label="Investment contributions" value={formatMoney(tradeoff.investmentContributions.toString())} />
          <StatTile label="Savings contributions" value={formatMoney(tradeoff.savingsContributions.toString())} />
        </div>
        <div className="mt-4">
          <CareerExpenseForm />
        </div>
      </Card>

      {timeline.length > 0 && (
        <Card>
          <CardHeader title="Internship timeline" subtitle="Month-by-month projection from the contribution plan." />
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Equity in</th>
                  <th>Savings in</th>
                  <th>Equity value</th>
                  <th>Savings value</th>
                  <th>Total</th>
                  <th>Contributed to date</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((row) => (
                  <tr key={row.month}>
                    <td className="mono">{row.month}</td>
                    <td className="mono">{formatMoney(row.equityIn.toString())}</td>
                    <td className="mono">{formatMoney(row.savingsIn.toString())}</td>
                    <td className="mono">{formatMoney(row.equityValue.toString())}</td>
                    <td className="mono">{formatMoney(row.savingsValue.toString())}</td>
                    <td className="mono font-semibold">{formatMoney(row.total.toString())}</td>
                    <td className="mono">{formatMoney(row.contributedToDate.toString())}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-2">
            Assumes a 10% annual equity return (planning assumption, not the fund&apos;s
            65.59%/12.4% stated figures — see Research for that conflict).
          </p>
        </Card>
      )}
    </div>
  );
}
