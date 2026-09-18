import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { getFundsForUser, getFundPortfolioSummary } from "@/lib/data/investments";
import { getSavingsAccountsForUser, currentBalance, getEmergencyFundStatus } from "@/lib/data/savings";
import { classifyLotLiquidity } from "@/lib/calculations/lockIn";

export interface NetWorthSummary {
  investmentValue: Decimal;
  savingsBalance: Decimal;
  otherAssets: Decimal;
  liabilities: Decimal;
  netWorth: Decimal;
  investmentValueIsPartial: boolean; // true if any fund is missing a current price
}

export async function getNetWorth(userId: string): Promise<NetWorthSummary> {
  const funds = await getFundsForUser(userId);
  let investmentValue = new Decimal(0);
  let investmentValueIsPartial = false;

  for (const fund of funds) {
    const summary = await getFundPortfolioSummary(fund.id);
    if (summary.currentValue) {
      investmentValue = investmentValue.plus(summary.currentValue);
    } else if (summary.lotCount > 0) {
      investmentValueIsPartial = true;
    }
  }

  const accounts = await getSavingsAccountsForUser(userId);
  const savingsBalance = accounts.reduce(
    (sum, acc) => sum.plus(currentBalance(acc.transactions)),
    new Decimal(0)
  );

  const otherAssets = new Decimal(0);
  const liabilities = new Decimal(0);

  return {
    investmentValue,
    savingsBalance,
    otherAssets,
    liabilities,
    netWorth: investmentValue.plus(savingsBalance).plus(otherAssets).minus(liabilities),
    investmentValueIsPartial,
  };
}

export interface LiquiditySummary {
  accessibleNow: Decimal;
  locked: Decimal;
  nextUnlock: { date: Date; amount: Decimal } | null;
}

export async function getLiquiditySummary(userId: string): Promise<LiquiditySummary> {
  const now = new Date();
  const funds = await getFundsForUser(userId);
  const accounts = await getSavingsAccountsForUser(userId);
  const savingsBalance = accounts.reduce(
    (sum, acc) => sum.plus(currentBalance(acc.transactions)),
    new Decimal(0)
  );

  let lockedValue = new Decimal(0);
  let unlockedInvestmentValue = new Decimal(0);
  let nextUnlock: { date: Date; amount: Decimal } | null = null;

  for (const fund of funds) {
    const latestPrice = fund.priceHistory[0] ?? null;
    const currentUnitPrice = latestPrice ? new Decimal(latestPrice.unitPrice) : null;
    if (!currentUnitPrice) continue;

    for (const lot of fund.lots) {
      const unlockDate =
        fund.lockMethodology === "UNKNOWN" || fund.lockMethodology === "CUSTOM" ? null : lot.unlockDate;
      const liquidity = classifyLotLiquidity(unlockDate, now);
      const value = new Decimal(lot.units).times(currentUnitPrice);

      if (liquidity === "UNLOCKED") {
        unlockedInvestmentValue = unlockedInvestmentValue.plus(value);
      } else {
        lockedValue = lockedValue.plus(value);
        if (unlockDate && (!nextUnlock || unlockDate < nextUnlock.date)) {
          nextUnlock = { date: unlockDate, amount: new Decimal(lot.contribution.amount) };
        }
      }
    }
  }

  return {
    accessibleNow: savingsBalance.plus(unlockedInvestmentValue),
    locked: lockedValue,
    nextUnlock,
  };
}

export async function getDataQualitySummary(userId: string) {
  const openConflicts = await prisma.dataConflict.count({ where: { userId, status: "OPEN" } });
  const unverifiedPrices = await prisma.fundPrice.count({
    where: { fund: { userId }, verificationStatus: { in: ["UNVERIFIED", "STALE"] } },
  });
  const fundsWithoutPrice = (await getFundsForUser(userId)).filter((f) => f.priceHistory.length === 0).length;

  return { openConflicts, unverifiedPrices, fundsWithoutPrice };
}

export { getEmergencyFundStatus };
