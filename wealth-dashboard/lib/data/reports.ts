import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { getNetWorth, getLiquiditySummary, getDataQualitySummary } from "@/lib/data/dashboard";
import { getFundsForUser, getFundPortfolioSummary } from "@/lib/data/investments";
import { getSavingsAccountsForUser, currentBalance, getEmergencyFundStatus } from "@/lib/data/savings";
import { totalStudyHours, questionsPerHour, mockAverage } from "@/lib/calculations/studyAnalytics";

export interface ReportSnapshot {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  financial: {
    netWorth: string;
    investmentValue: string;
    savingsBalance: string;
    totalContributions: string;
    unrealizedGainLoss: string;
  };
  investments: {
    fundName: string;
    contributions: string;
    units: string;
    currentPrice: string | null;
    currentValue: string | null;
    simpleReturn: string | null;
    xirr: number | null;
  }[];
  liquidity: {
    accessibleNow: string;
    locked: string;
    nextUnlock: { date: string; amount: string } | null;
  };
  savings: {
    accountName: string;
    balance: string;
  }[];
  emergencyFund: {
    target: string;
    current: string;
    percentageFunded: string;
    monthsCovered: string;
  };
  career: {
    examName: string;
    studyHours: string;
    questionsPerHour: string;
    mockAverage: string | null;
  }[];
  dataQuality: {
    openConflicts: number;
    unverifiedPrices: number;
    fundsWithoutPrice: number;
  };
}

export async function buildReportSnapshot(userId: string, periodStart: Date, periodEnd: Date): Promise<ReportSnapshot> {
  const [netWorth, liquidity, dataQuality, funds, accounts, emergencyFund, exams] = await Promise.all([
    getNetWorth(userId),
    getLiquiditySummary(userId),
    getDataQualitySummary(userId),
    getFundsForUser(userId),
    getSavingsAccountsForUser(userId),
    getEmergencyFundStatus(userId),
    prisma.exam.findMany({ where: { userId }, include: { studySessions: true } }),
  ]);

  const fundSummaries = await Promise.all(funds.map((f) => getFundPortfolioSummary(f.id)));
  const totalContributions = fundSummaries.reduce(
    (s, f) => s.plus(f.totalContributions),
    new Decimal(0)
  );
  const totalUnrealizedGainLoss = fundSummaries.reduce(
    (s, f) => s.plus(f.unrealizedGainLoss ?? 0),
    new Decimal(0)
  );

  return {
    generatedAt: new Date().toISOString(),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    financial: {
      netWorth: netWorth.netWorth.toString(),
      investmentValue: netWorth.investmentValue.toString(),
      savingsBalance: netWorth.savingsBalance.toString(),
      totalContributions: totalContributions.toString(),
      unrealizedGainLoss: totalUnrealizedGainLoss.toString(),
    },
    investments: fundSummaries.map((s) => ({
      fundName: s.fundName,
      contributions: s.totalContributions.toString(),
      units: s.totalUnits.toString(),
      currentPrice: s.currentUnitPrice?.toString() ?? null,
      currentValue: s.currentValue?.toString() ?? null,
      simpleReturn: s.simpleReturn?.toString() ?? null,
      xirr: s.xirr,
    })),
    liquidity: {
      accessibleNow: liquidity.accessibleNow.toString(),
      locked: liquidity.locked.toString(),
      nextUnlock: liquidity.nextUnlock
        ? { date: liquidity.nextUnlock.date.toISOString(), amount: liquidity.nextUnlock.amount.toString() }
        : null,
    },
    savings: accounts.map((a) => ({ accountName: a.name, balance: currentBalance(a.transactions).toString() })),
    emergencyFund: {
      target: emergencyFund.target.toString(),
      current: emergencyFund.currentSavings.toString(),
      percentageFunded: emergencyFund.percentageFunded.toString(),
      monthsCovered: emergencyFund.monthsCovered.toString(),
    },
    career: exams.map((e) => ({
      examName: e.name,
      studyHours: totalStudyHours(e.studySessions).toString(),
      questionsPerHour: questionsPerHour(e.studySessions).toString(),
      mockAverage: mockAverage(e.studySessions)?.toString() ?? null,
    })),
    dataQuality,
  };
}

export async function generateReport(userId: string, type: "monthly" | "quarterly") {
  const now = new Date();
  const periodStart = new Date(now);
  if (type === "monthly") {
    periodStart.setUTCMonth(periodStart.getUTCMonth() - 1);
  } else {
    periodStart.setUTCMonth(periodStart.getUTCMonth() - 3);
  }

  const snapshot = await buildReportSnapshot(userId, periodStart, now);

  return prisma.report.create({
    data: {
      userId,
      type,
      periodStart,
      periodEnd: now,
      snapshot: JSON.parse(JSON.stringify(snapshot)),
    },
  });
}
