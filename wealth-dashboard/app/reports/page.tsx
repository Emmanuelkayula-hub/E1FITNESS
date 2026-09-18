import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import type { ReportSnapshot } from "@/lib/data/reports";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { ReportGenerateButtons } from "@/components/reports/ReportGenerateButtons";
import { CsvImportForm } from "@/components/import/CsvImportForm";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const [reports, funds, savingsAccounts] = await Promise.all([
    prisma.report.findMany({
      where: { userId: user.id },
      orderBy: { generatedAt: "desc" },
      take: 12,
    }),
    prisma.investmentFund.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
    prisma.savingsAccount.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);

  const latest = reports[0];
  const snapshot = latest ? (latest.snapshot as unknown as ReportSnapshot) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted">
          Generated reports reconcile against the same live figures shown elsewhere in
          the app — they are a snapshot, not a separate calculation.
        </p>
      </div>

      <Card>
        <CardHeader title="Generate a report" />
        <ReportGenerateButtons />
      </Card>

      <Card>
        <CardHeader title="Export data" subtitle="CSV, opens/downloads directly." />
        <div className="flex flex-wrap gap-3">
          <a className="btn-secondary" href="/api/export/transactions">
            Investment transactions
          </a>
          <a className="btn-secondary" href="/api/export/portfolio">
            Portfolio (lots)
          </a>
          <a className="btn-secondary" href="/api/export/savings">
            Savings transactions
          </a>
          <a className="btn-secondary" href="/api/export/career">
            Career data
          </a>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Import data"
          subtitle="Preview and validate before anything is written — duplicate and invalid rows are never imported."
        />
        <CsvImportForm funds={funds} savingsAccounts={savingsAccounts} />
      </Card>

      {reports.length > 0 && (
        <Card>
          <CardHeader title="Report history" />
          <table className="table-base">
            <thead>
              <tr>
                <th>Type</th>
                <th>Period</th>
                <th>Generated</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="capitalize">{r.type}</td>
                  <td className="mono">
                    {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                  </td>
                  <td className="mono">{formatDate(r.generatedAt)}</td>
                  <td>
                    <a className="text-accent underline" href={`/api/reports/${r.id}/pdf`}>
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {snapshot && (
        <Card className="print:shadow-none">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">EK Wealth & Career Dashboard</h2>
              <p className="text-sm text-muted">
                {latest.type === "monthly" ? "Monthly" : "Quarterly"} report — {formatDate(snapshot.periodStart)} to{" "}
                {formatDate(snapshot.periodEnd)}
              </p>
            </div>
          </div>

          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Financial summary</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile label="Net worth" value={formatMoney(snapshot.financial.netWorth)} />
              <StatTile label="Investment value" value={formatMoney(snapshot.financial.investmentValue)} />
              <StatTile label="Savings" value={formatMoney(snapshot.financial.savingsBalance)} />
              <StatTile label="Unrealised gain/loss" value={formatMoney(snapshot.financial.unrealizedGainLoss)} />
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Investment</h3>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Fund</th>
                  <th>Contributions</th>
                  <th>Current value</th>
                  <th>Simple return</th>
                  <th>XIRR</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.investments.map((inv) => (
                  <tr key={inv.fundName}>
                    <td>{inv.fundName}</td>
                    <td className="mono">{formatMoney(inv.contributions)}</td>
                    <td className="mono">{inv.currentValue ? formatMoney(inv.currentValue) : "—"}</td>
                    <td className="mono">{inv.simpleReturn ? formatPercent(inv.simpleReturn) : "—"}</td>
                    <td className="mono">{inv.xirr !== null ? formatPercent(inv.xirr) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Liquidity</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatTile label="Accessible now" value={formatMoney(snapshot.liquidity.accessibleNow)} />
              <StatTile label="Locked" value={formatMoney(snapshot.liquidity.locked)} />
              <StatTile
                label="Next unlock"
                value={snapshot.liquidity.nextUnlock ? formatMoney(snapshot.liquidity.nextUnlock.amount) : "None pending"}
                sub={snapshot.liquidity.nextUnlock ? formatDate(snapshot.liquidity.nextUnlock.date) : undefined}
              />
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Savings</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {snapshot.savings.map((s) => (
                <StatTile key={s.accountName} label={s.accountName} value={formatMoney(s.balance)} />
              ))}
              <StatTile
                label="Emergency fund coverage"
                value={formatPercent(snapshot.emergencyFund.percentageFunded, { alreadyPercent: true })}
                sub={`Target ${formatMoney(snapshot.emergencyFund.target)}`}
              />
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Career</h3>
            {snapshot.career.length === 0 ? (
              <p className="text-sm text-muted">No exams tracked this period.</p>
            ) : (
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Study hours</th>
                    <th>Questions/hour</th>
                    <th>Mock average</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.career.map((c) => (
                    <tr key={c.examName}>
                      <td>{c.examName}</td>
                      <td className="mono">{Number(c.studyHours).toFixed(1)}</td>
                      <td className="mono">{Number(c.questionsPerHour).toFixed(2)}</td>
                      <td className="mono">{c.mockAverage ? `${Number(c.mockAverage).toFixed(1)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="mb-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Data quality</h3>
            <div className="grid grid-cols-3 gap-4">
              <StatTile label="Open data conflicts" value={String(snapshot.dataQuality.openConflicts)} />
              <StatTile label="Unverified/stale prices" value={String(snapshot.dataQuality.unverifiedPrices)} />
              <StatTile label="Funds missing a price" value={String(snapshot.dataQuality.fundsWithoutPrice)} />
            </div>
          </section>

          <p className="border-t border-border pt-4 text-xs text-muted-2">
            This report is a personal tracking and analytical report. It is not investment
            advice. Generated {formatDate(snapshot.generatedAt)}.
          </p>
        </Card>
      )}
    </div>
  );
}
