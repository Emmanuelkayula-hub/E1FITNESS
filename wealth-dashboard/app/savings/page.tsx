import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import {
  getSavingsAccountsForUser,
  getSavingsAccountSummary,
  getEmergencyFundStatus,
  currentBalance,
} from "@/lib/data/savings";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { VerificationBadge } from "@/components/ui/Badge";
import { SavingsTransactionForm } from "@/components/savings/SavingsTransactionForm";
import { IncomeAllocationCalculator } from "@/components/savings/IncomeAllocationCalculator";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const user = await getCurrentUser();
  const accounts = await getSavingsAccountsForUser(user.id);
  const emergencyFund = await getEmergencyFundStatus(user.id);
  const plan = await prisma.contributionPlan.findFirst({
    where: { userId: user.id, active: true },
    include: { phases: { orderBy: { monthStart: "asc" } } },
  });

  const firstPhaseShare = plan?.phases[0]
    ? plan.phases[0].equityAmount
        .dividedBy(plan.phases[0].equityAmount.plus(plan.phases[0].savingsAmount))
        .toNumber()
    : 0.7;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Savings</h1>
        <p className="text-sm text-muted">FNB Savings Pocket tracker and emergency-fund coverage.</p>
      </div>

      <Card>
        <CardHeader title="Emergency fund" subtitle="Target = monthly essential expenses × target months." />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <StatTile label="Current savings" value={formatMoney(emergencyFund.currentSavings.toString())} />
          <StatTile label="Target" value={formatMoney(emergencyFund.target.toString())} />
          <StatTile
            label="Percentage funded"
            value={formatPercent(emergencyFund.percentageFunded.toString(), {
              alreadyPercent: true,
              showSign: false,
            })}
            tone={emergencyFund.percentageFunded.gte(100) ? "positive" : "neutral"}
          />
          <StatTile
            label="Months covered"
            value={emergencyFund.monthsCovered.toNumber().toFixed(1)}
          />
        </div>
      </Card>

      {accounts.map((account) => {
        const balance = currentBalance(account.transactions);
        return (
          <div key={account.id} className="space-y-4">
            <h2 className="text-lg font-semibold">{account.name}</h2>

            <SavingsSummaryCard accountId={account.id} />

            <Card>
              <CardHeader title="Interest tiers" subtitle="User-entered assumption, not a live bank feed." />
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Balance band</th>
                    <th>Annual rate</th>
                    <th>Effective from</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {account.rates.map((rate) => (
                    <tr key={rate.id}>
                      <td className="mono">
                        {formatMoney(rate.balanceBandMin.toString())}
                        {rate.balanceBandMax ? ` – ${formatMoney(rate.balanceBandMax.toString())}` : "+"}
                      </td>
                      <td className="mono">{rate.annualRatePercent.toString()}%</td>
                      <td className="mono">{formatDate(rate.effectiveDate)}</td>
                      <td>
                        <VerificationBadge status={rate.verificationStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card>
              <CardHeader title="Transaction ledger" />
              {account.transactions.length === 0 ? (
                <p className="text-sm text-muted">No transactions recorded yet.</p>
              ) : (
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Balance after</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="mono">{formatDate(tx.date)}</td>
                        <td className="capitalize">{tx.type}</td>
                        <td className="mono">{formatMoney(tx.amount.toString())}</td>
                        <td className="mono">{tx.balanceAfter ? formatMoney(tx.balanceAfter.toString()) : "—"}</td>
                        <td className="text-muted">{tx.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-2 text-xs text-muted-2">Running balance: {formatMoney(balance.toString())}</p>
            </Card>

            <Card>
              <CardHeader title="Record a transaction" />
              <SavingsTransactionForm accountId={account.id} />
            </Card>
          </div>
        );
      })}

      {plan && (
        <Card>
          <CardHeader
            title="Internship contribution plan"
            subtitle={`Monthly stipend ${formatMoney(plan.monthlyStipend.toString())} — configurable schedule, not hardcoded.`}
          />
          <table className="table-base">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Months</th>
                <th>Equity / month</th>
                <th>Savings / month</th>
                <th>Equity share</th>
              </tr>
            </thead>
            <tbody>
              {plan.phases.map((phase) => (
                <tr key={phase.id}>
                  <td>{phase.label}</td>
                  <td className="mono">
                    {phase.monthStart}–{phase.monthEnd}
                  </td>
                  <td className="mono">{formatMoney(phase.equityAmount.toString())}</td>
                  <td className="mono">{formatMoney(phase.savingsAmount.toString())}</td>
                  <td className="mono">
                    {formatPercent(
                      phase.equityAmount.dividedBy(phase.equityAmount.plus(phase.savingsAmount)).toString(),
                      { alreadyPercent: false, showSign: false }
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <CardHeader
          title="If my income changes"
          subtitle="Survival-first override: below the threshold, equity floors at K100 and the rest goes to savings."
        />
        <IncomeAllocationCalculator defaultReferenceShare={firstPhaseShare} />
      </Card>
    </div>
  );
}

async function SavingsSummaryCard({ accountId }: { accountId: string }) {
  const summary = await getSavingsAccountSummary(accountId);
  return (
    <Card>
      <CardHeader title="Balance & interest" />
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <StatTile label="Balance" value={formatMoney(summary.balance.toString())} />
        <StatTile
          label="Current tier"
          value={summary.currentTierPercent ? `${summary.currentTierPercent.toString()}%` : "Below minimum"}
        />
        <StatTile
          label="Estimated monthly interest"
          value={formatMoney(summary.estimatedMonthlyInterest.toString())}
          sub="Estimated, not yet posted"
        />
        <StatTile
          label="Estimated annual interest"
          value={formatMoney(summary.estimatedAnnualInterest.toString())}
          sub="Estimated, not yet posted"
        />
      </div>
    </Card>
  );
}
