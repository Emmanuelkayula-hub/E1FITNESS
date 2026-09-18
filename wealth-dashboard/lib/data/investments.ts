import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
import {
  calculateUnits,
  calculatePortfolioValue,
  calculateSimpleReturn,
  calculateXIRR,
} from "@/lib/calculations/finance";
import {
  calculateUnlockDate,
  classifyLotLiquidity,
  type LockMethodology,
} from "@/lib/calculations/lockIn";
import { writeAuditLog } from "@/lib/data/auditLog";
import type { ContributionInput, FundPriceInput } from "@/lib/validation/investments";

export async function getFundsForUser(userId: string) {
  return prisma.investmentFund.findMany({
    where: { userId },
    include: {
      researchProfile: true,
      lots: { include: { contribution: true }, orderBy: { purchaseDate: "asc" } },
      priceHistory: { orderBy: { date: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Creates a Contribution + its permanent InvestmentLot atomically (spec §8–§9). */
export async function recordContribution(userId: string, input: ContributionInput) {
  const fund = await prisma.investmentFund.findFirst({
    where: { id: input.fundId, userId },
  });
  if (!fund) throw new Error("Fund not found for this user.");

  const units = calculateUnits(input.amount, input.unitPriceAtPurchase);
  const netInvested = new Decimal(input.amount).minus(input.fees ?? 0);

  const earliestLot = await prisma.investmentLot.findFirst({
    where: { fundId: fund.id },
    orderBy: { purchaseDate: "asc" },
  });
  const firstInvestmentDate =
    earliestLot && earliestLot.purchaseDate < input.date
      ? earliestLot.purchaseDate
      : input.date;

  const unlockDate = calculateUnlockDate({
    contributionDate: input.date,
    firstInvestmentDate,
    minimumHoldingMonths: fund.minimumHoldingMonths,
    methodology: fund.lockMethodology as LockMethodology,
  });

  const result = await prisma.$transaction(async (tx) => {
    const contribution = await tx.contribution.create({
      data: {
        userId,
        fundId: fund.id,
        date: input.date,
        amount: input.amount,
        unitPriceAtPurchase: input.unitPriceAtPurchase,
        fees: input.fees ?? 0,
        netInvested: netInvested.toString(),
        source: input.source,
        notes: input.notes,
      },
    });

    const lot = await tx.investmentLot.create({
      data: {
        userId,
        fundId: fund.id,
        contributionId: contribution.id,
        purchaseDate: input.date,
        units: units.toString(),
        purchasePrice: input.unitPriceAtPurchase,
        // UNKNOWN/CUSTOM methodologies yield no computed date; store the
        // contribution date as a clearly-provisional placeholder rather
        // than a nullable column driving UI branches everywhere.
        unlockDate: unlockDate ?? input.date,
      },
    });

    return { contribution, lot };
  });

  await writeAuditLog({
    userId,
    action: "contribution.created",
    entityType: "Contribution",
    entityId: result.contribution.id,
    newValue: {
      fundId: fund.id,
      date: input.date.toISOString(),
      amount: input.amount,
      unitPriceAtPurchase: input.unitPriceAtPurchase,
      units: units.toString(),
      unlockDateKnown: unlockDate !== null,
    },
  });

  return result;
}

export async function recordFundPrice(userId: string, input: FundPriceInput) {
  const fund = await prisma.investmentFund.findFirst({
    where: { id: input.fundId, userId },
  });
  if (!fund) throw new Error("Fund not found for this user.");

  const price = await prisma.fundPrice.create({
    data: {
      fundId: fund.id,
      date: input.date,
      unitPrice: input.unitPrice,
      source: input.source,
      sourceType: input.sourceType,
      verificationStatus: input.verificationStatus,
      notes: input.notes,
    },
  });

  await writeAuditLog({
    userId,
    action: "price.recorded",
    entityType: "FundPrice",
    entityId: price.id,
    newValue: {
      fundId: fund.id,
      date: input.date.toISOString(),
      unitPrice: input.unitPrice,
      source: input.source,
    },
  });

  return price;
}

export interface FundPortfolioSummary {
  fundId: string;
  fundName: string;
  currentUnitPrice: Decimal | null;
  currentUnitPriceObservedAt: Date | null;
  totalUnits: Decimal;
  totalContributions: Decimal;
  netInvested: Decimal;
  currentValue: Decimal | null;
  unrealizedGainLoss: Decimal | null;
  simpleReturn: Decimal | null;
  xirr: number | null;
  xirrError: string | null;
  lotCount: number;
  nextUnlock: { date: Date; amount: Decimal } | null;
  lockMethodologyConfirmed: boolean;
}

/** Aggregates one fund's ledger into the numbers the spec's dashboard/investments
 *  pages need (spec §6–§11). */
export async function getFundPortfolioSummary(fundId: string): Promise<FundPortfolioSummary> {
  const fund = await prisma.investmentFund.findUniqueOrThrow({
    where: { id: fundId },
    include: {
      lots: { include: { contribution: true }, orderBy: { purchaseDate: "asc" } },
      priceHistory: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  const latestPrice = fund.priceHistory[0] ?? null;
  const currentUnitPrice = latestPrice ? new Decimal(latestPrice.unitPrice) : null;

  const totalUnits = fund.lots.reduce(
    (sum, lot) => sum.plus(new Decimal(lot.units)),
    new Decimal(0)
  );
  const totalContributions = fund.lots.reduce(
    (sum, lot) => sum.plus(new Decimal(lot.contribution.amount)),
    new Decimal(0)
  );
  const netInvested = fund.lots.reduce(
    (sum, lot) => sum.plus(new Decimal(lot.contribution.netInvested)),
    new Decimal(0)
  );

  const currentValue = currentUnitPrice
    ? calculatePortfolioValue(fund.lots, currentUnitPrice)
    : null;
  const unrealizedGainLoss = currentValue ? currentValue.minus(totalContributions) : null;
  const simpleReturn = currentValue ? calculateSimpleReturn(currentValue, totalContributions) : null;

  let xirr: number | null = null;
  let xirrError: string | null = null;
  if (currentValue && fund.lots.length >= 1) {
    try {
      const cashFlows = fund.lots.map((lot) => ({
        date: lot.purchaseDate,
        amount: -new Decimal(lot.contribution.amount).toNumber(),
      }));
      cashFlows.push({ date: new Date(), amount: currentValue.toNumber() });
      xirr = calculateXIRR(cashFlows);
    } catch (e) {
      xirrError = e instanceof Error ? e.message : "Could not compute XIRR.";
    }
  }

  const now = new Date();
  const upcomingLots = fund.lots
    .filter((lot) => lot.unlockDate > now)
    .sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime());
  const nextUnlock = upcomingLots[0]
    ? { date: upcomingLots[0].unlockDate, amount: new Decimal(upcomingLots[0].contribution.amount) }
    : null;

  return {
    fundId: fund.id,
    fundName: fund.name,
    currentUnitPrice,
    currentUnitPriceObservedAt: latestPrice?.date ?? null,
    totalUnits,
    totalContributions,
    netInvested,
    currentValue,
    unrealizedGainLoss,
    simpleReturn,
    xirr,
    xirrError,
    lotCount: fund.lots.length,
    nextUnlock,
    lockMethodologyConfirmed: false, // wired to ApplicationSetting in Settings; see dashboard aggregation
  };
}

export type LotWithLiquidity = Awaited<ReturnType<typeof getLotsWithLiquidity>>[number];

export async function getLotsWithLiquidity(fundId: string, asOf: Date = new Date()) {
  const lots = await prisma.investmentLot.findMany({
    where: { fundId },
    include: { contribution: true },
    orderBy: { purchaseDate: "desc" },
  });
  const fund = await prisma.investmentFund.findUniqueOrThrow({ where: { id: fundId } });
  const latestPrice = await prisma.fundPrice.findFirst({
    where: { fundId },
    orderBy: { date: "desc" },
  });
  const currentUnitPrice = latestPrice ? new Decimal(latestPrice.unitPrice) : null;

  return lots.map((lot) => {
    const unlockDate = fund.lockMethodology === "UNKNOWN" || fund.lockMethodology === "CUSTOM" ? null : lot.unlockDate;
    return {
      ...lot,
      liquidity: classifyLotLiquidity(unlockDate, asOf),
      currentValue: currentUnitPrice ? new Decimal(lot.units).times(currentUnitPrice) : null,
    };
  });
}
