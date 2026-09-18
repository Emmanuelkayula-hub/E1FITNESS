import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { getFundsForUser, getFundPortfolioSummary, getLotsWithLiquidity } from "@/lib/data/investments";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Badge, VerificationBadge } from "@/components/ui/Badge";
import { LotTable, type LotRow } from "@/components/investments/LotTable";
import { ContributionForm } from "@/components/investments/ContributionForm";
import { PriceForm } from "@/components/investments/PriceForm";
import {
  EarlyWithdrawalCalculator,
  type WithdrawableLot,
} from "@/components/investments/EarlyWithdrawalCalculator";
import { formatDate, formatMoney, formatPercent, formatUnits, daysUntil } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const user = await getCurrentUser();
  const funds = await getFundsForUser(user.id);

  if (funds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Investments</h1>
        <p className="text-sm text-muted">No investment funds set up yet. Run the seed script or add one via Prisma Studio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Investments</h1>
        <p className="text-sm text-muted">
          Contribution ledger, lot-by-lot unit accounting, and the lock-in / unlock
          calendar.
        </p>
      </div>

      {await Promise.all(
        funds.map(async (fund) => {
          const summary = await getFundPortfolioSummary(fund.id);
          const lots = await getLotsWithLiquidity(fund.id);
          const openConflict = await prisma.dataConflict.findFirst({
            where: {
              entityType: "InvestmentFund",
              entityId: fund.id,
              field: "twelveMonthReturnPercent",
              status: "OPEN",
            },
          });

          const lotRows: LotRow[] = lots.map((lot) => ({
            id: lot.id,
            purchaseDate: lot.purchaseDate,
            amount: lot.contribution.amount.toString(),
            purchasePrice: lot.purchasePrice.toString(),
            units: lot.units.toString(),
            unlockDate: lot.unlockDate,
            liquidity: lot.liquidity,
            currentValue: lot.currentValue ? lot.currentValue.toString() : null,
          }));

          const withdrawableLots: WithdrawableLot[] = lots.map((lot) => ({
            id: lot.id,
            label: `${formatDate(lot.purchaseDate)} — ${formatMoney(lot.contribution.amount.toString())}`,
            units: lot.units.toString(),
            totalContributed: lot.contribution.amount.toString(),
            unlockDate: lot.unlockDate.toISOString(),
            isLocked: lot.liquidity === "LOCKED" || lot.liquidity === "UNLOCKING_SOON",
          }));

          return (
            <div key={fund.id} className="space-y-4">
              <h2 className="text-lg font-semibold">{fund.name}</h2>

              <Card>
                <CardHeader
                  title="Portfolio summary"
                  action={
                    summary.currentUnitPriceObservedAt ? (
                      <span className="text-xs text-muted-2">
                        Price as of {formatDate(summary.currentUnitPriceObservedAt)}
                      </span>
                    ) : (
                      <Badge tone="unverified">No price recorded</Badge>
                    )
                  }
                />
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  <StatTile label="Total contributions" value={formatMoney(summary.totalContributions.toString())} />
                  <StatTile
                    label="Current value"
                    value={summary.currentValue ? formatMoney(summary.currentValue.toString()) : "—"}
                  />
                  <StatTile label="Units owned" value={formatUnits(summary.totalUnits.toString())} />
                  <StatTile
                    label="Current unit price"
                    value={summary.currentUnitPrice ? formatMoney(summary.currentUnitPrice.toString()) : "—"}
                  />
                  <StatTile
                    label="Unrealised gain/loss"
                    value={summary.unrealizedGainLoss ? formatMoney(summary.unrealizedGainLoss.toString()) : "—"}
                    tone={summary.unrealizedGainLoss?.gte(0) ? "positive" : summary.unrealizedGainLoss ? "negative" : "neutral"}
                  />
                  <StatTile
                    label="Simple return"
                    value={summary.simpleReturn ? formatPercent(summary.simpleReturn.toString()) : "—"}
                    tone={summary.simpleReturn?.gte(0) ? "positive" : summary.simpleReturn ? "negative" : "neutral"}
                  />
                  <StatTile
                    label="Money-weighted return (XIRR)"
                    value={summary.xirr !== null ? formatPercent(summary.xirr, { alreadyPercent: false }) : "Insufficient history"}
                    sub={summary.xirrError ?? undefined}
                  />
                  <StatTile label="Annual management fee" value={`${fund.annualFeePercent.toString()}%`} />
                  <StatTile label="Number of lots" value={String(summary.lotCount)} />
                  <StatTile
                    label="Next unlock"
                    value={summary.nextUnlock ? formatMoney(summary.nextUnlock.amount.toString()) : "None pending"}
                    sub={
                      summary.nextUnlock
                        ? `${formatDate(summary.nextUnlock.date)} · ${daysUntil(summary.nextUnlock.date)}d`
                        : undefined
                    }
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-sm">
                  <span className="text-muted">Longhorn-stated 12-month return:</span>
                  {fund.researchProfile?.twelveMonthReturnPercent ? (
                    <>
                      <span className="mono font-semibold">
                        {fund.researchProfile.twelveMonthReturnPercent.toString()}%
                      </span>
                      <VerificationBadge status={fund.researchProfile.verificationStatus} />
                    </>
                  ) : (
                    <Badge tone="unverified">Not recorded</Badge>
                  )}
                  {openConflict && (
                    <Badge tone="conflicting">
                      DATA DISCREPANCY DETECTED — see Research
                    </Badge>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader title="Lot ledger" subtitle="Every contribution is a permanent, individual lot." />
                <LotTable lots={lotRows} />
              </Card>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Record a contribution" />
                  <ContributionForm fundId={fund.id} />
                </Card>
                <Card>
                  <CardHeader title="Record a price observation" />
                  <PriceForm fundId={fund.id} />
                </Card>
              </div>

              <Card>
                <CardHeader
                  title="Early withdrawal calculator"
                  subtitle="Estimate only — not a recommendation to withdraw."
                />
                <EarlyWithdrawalCalculator
                  lots={withdrawableLots}
                  currentUnitPrice={summary.currentUnitPrice ? summary.currentUnitPrice.toString() : null}
                  penaltyPercent={fund.earlyWithdrawalPenaltyPercent.toString()}
                />
              </Card>
            </div>
          );
        })
      )}
    </div>
  );
}
