import { getCurrentUser } from "@/lib/currentUser";
import { getFundsForUser, getFundPortfolioSummary } from "@/lib/data/investments";
import { getSavingsAccountsForUser, currentBalance, getEmergencyFundStatus } from "@/lib/data/savings";
import { getNetWorth, getLiquiditySummary, getDataQualitySummary } from "@/lib/data/dashboard";
import { computeAlerts } from "@/lib/data/alerts";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney, formatPercent, formatDate, daysUntil } from "@/lib/format";
import Decimal from "decimal.js";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [netWorth, liquidity, alerts, dataQuality, funds, accounts, emergencyFund] = await Promise.all([
    getNetWorth(user.id),
    getLiquiditySummary(user.id),
    computeAlerts(user.id),
    getDataQualitySummary(user.id),
    getFundsForUser(user.id),
    getSavingsAccountsForUser(user.id),
    getEmergencyFundStatus(user.id),
  ]);

  const fundSummaries = await Promise.all(funds.map((f) => getFundPortfolioSummary(f.id)));
  const totalContributions = fundSummaries.reduce(
    (sum, s) => sum.plus(s.totalContributions),
    new Decimal(0)
  );
  const totalUnrealizedGainLoss = fundSummaries.reduce(
    (sum, s) => sum.plus(s.unrealizedGainLoss ?? 0),
    new Decimal(0)
  );
  const savingsBalance = accounts.reduce(
    (sum, acc) => sum.plus(currentBalance(acc.transactions)),
    new Decimal(0)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Welcome, {user.name ?? user.email}</h1>
        <p className="text-sm text-muted">
          Personal tracking &amp; analytical dashboard. Not investment advice.
        </p>
      </div>

      {/* 1. Net worth */}
      <Card>
        <StatTile
          label="Net worth"
          value={formatMoney(netWorth.netWorth.toString())}
          sub={netWorth.investmentValueIsPartial ? "Partial — a fund is missing a current price" : undefined}
        />
      </Card>

      {/* 2. Investment / savings / contributions / gain-loss */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <StatTile label="Investment value" value={formatMoney(netWorth.investmentValue.toString())} />
        </Card>
        <Card>
          <StatTile label="Savings" value={formatMoney(savingsBalance.toString())} />
        </Card>
        <Card>
          <StatTile label="Total contributions" value={formatMoney(totalContributions.toString())} />
        </Card>
        <Card>
          <StatTile
            label="Unrealised gain/loss"
            value={formatMoney(totalUnrealizedGainLoss.toString())}
            tone={totalUnrealizedGainLoss.gte(0) ? "positive" : "negative"}
          />
        </Card>
      </div>

      {/* 3. Liquidity / next unlock / emergency fund */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Liquidity" />
          <div className="space-y-3">
            <StatTile label="Accessible now" value={formatMoney(liquidity.accessibleNow.toString())} />
            <StatTile label="Locked" value={formatMoney(liquidity.locked.toString())} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Next unlock" />
          {liquidity.nextUnlock ? (
            <StatTile
              label={formatDate(liquidity.nextUnlock.date)}
              value={formatMoney(liquidity.nextUnlock.amount.toString())}
              sub={`${daysUntil(liquidity.nextUnlock.date)} day(s) remaining`}
            />
          ) : (
            <p className="text-sm text-muted">No locked lots pending unlock.</p>
          )}
        </Card>
        <Card>
          <CardHeader title="Emergency fund" />
          <StatTile
            label="Percentage funded"
            value={formatPercent(emergencyFund.percentageFunded.toString(), {
              alreadyPercent: true,
              showSign: false,
            })}
            sub={`${emergencyFund.monthsCovered.toNumber().toFixed(1)} months covered · target ${formatMoney(
              emergencyFund.target.toString()
            )}`}
            tone={emergencyFund.percentageFunded.gte(100) ? "positive" : "neutral"}
          />
        </Card>
      </div>

      {/* 4. Investment summary per fund */}
      <Card>
        <CardHeader title="Investment summary" />
        <div className="space-y-4">
          {fundSummaries.map((s) => (
            <div key={s.fundId} className="border-b border-border pb-4 last:border-none last:pb-0">
              <h3 className="mb-2 text-sm font-semibold">{s.fundName}</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <StatTile label="Units" value={s.totalUnits.toNumber().toFixed(4)} />
                <StatTile
                  label="Current price"
                  value={s.currentUnitPrice ? formatMoney(s.currentUnitPrice.toString()) : "—"}
                />
                <StatTile
                  label="Simple return"
                  value={s.simpleReturn ? formatPercent(s.simpleReturn.toString()) : "—"}
                  tone={s.simpleReturn?.gte(0) ? "positive" : s.simpleReturn ? "negative" : "neutral"}
                />
                <StatTile label="Lots" value={String(s.lotCount)} />
                <StatTile
                  label="Next unlock"
                  value={s.nextUnlock ? formatDate(s.nextUnlock.date) : "None pending"}
                />
              </div>
            </div>
          ))}
          {fundSummaries.length === 0 && <p className="text-sm text-muted">No investments recorded yet.</p>}
        </div>
      </Card>

      {/* 5. Career summary */}
      <Card>
        <CardHeader title="Career summary" />
        {user.careerProfile ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Qualification" value={user.careerProfile.qualification ?? "—"} />
            <StatTile label="Institution" value={user.careerProfile.institution ?? "—"} />
            <StatTile
              label="Graduation"
              value={user.careerProfile.graduationDate ? formatDate(user.careerProfile.graduationDate) : "—"}
            />
            <StatTile
              label="Current role"
              value={`${user.careerProfile.currentRole ?? "—"}${
                user.careerProfile.currentEmployer ? ` · ${user.careerProfile.currentEmployer}` : ""
              }`}
              sub={user.careerProfile.department ?? undefined}
            />
          </div>
        ) : (
          <p className="text-sm text-muted">No career profile recorded yet.</p>
        )}
        <p className="mt-3 text-xs text-muted-2">
          Exam and study-progress tracking is on the Career page.
        </p>
      </Card>

      {/* 6. Alerts / data quality */}
      <Card>
        <CardHeader
          title="Alerts"
          subtitle={`${dataQuality.openConflicts} open data conflict(s) · ${dataQuality.fundsWithoutPrice} fund(s) missing a price`}
        />
        <ul className="space-y-2">
          {alerts.map((alert, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <Badge
                tone={alert.severity === "critical" ? "conflicting" : alert.severity === "warning" ? "assumption" : "neutral"}
              >
                {alert.severity.toUpperCase()}
              </Badge>
              <div>
                <p className="font-medium">{alert.title}</p>
                <p className="text-muted">{alert.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
