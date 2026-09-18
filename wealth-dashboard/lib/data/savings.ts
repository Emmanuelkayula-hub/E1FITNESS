import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/data/auditLog";
import {
  findSavingsTier,
  calculateMonthlySavingsInterest,
  calculateEmergencyFundCoverage,
  type SavingsTierBand,
} from "@/lib/calculations/savings";
import type { SavingsTransactionInput } from "@/lib/validation/savings";

export async function getSavingsAccountsForUser(userId: string) {
  return prisma.savingsAccount.findMany({
    where: { userId },
    include: {
      rates: { orderBy: { balanceBandMin: "asc" } },
      transactions: { orderBy: { date: "desc" } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function ratesToBands(
  rates: { balanceBandMin: Decimal.Value; balanceBandMax: Decimal.Value | null; annualRatePercent: Decimal.Value }[]
): SavingsTierBand[] {
  return rates.map((r) => ({
    min: r.balanceBandMin,
    max: r.balanceBandMax,
    annualRatePercent: r.annualRatePercent,
  }));
}

export function currentBalance(transactions: { type: string; amount: Decimal.Value }[]): Decimal {
  return transactions.reduce((sum, tx) => {
    const amt = new Decimal(tx.amount);
    return tx.type === "withdrawal" ? sum.minus(amt) : sum.plus(amt);
  }, new Decimal(0));
}

export async function recordSavingsTransaction(userId: string, input: SavingsTransactionInput) {
  const account = await prisma.savingsAccount.findFirst({
    where: { id: input.accountId, userId },
    include: { transactions: true },
  });
  if (!account) throw new Error("Savings account not found for this user.");

  const balanceBefore = currentBalance(account.transactions);
  const delta = input.type === "withdrawal" ? new Decimal(input.amount).negated() : new Decimal(input.amount);
  const balanceAfter = balanceBefore.plus(delta);

  if (input.type === "withdrawal" && balanceAfter.lt(0)) {
    throw new Error(
      `Withdrawal of ${input.amount} exceeds the current balance of ${balanceBefore.toString()}.`
    );
  }

  const tx = await prisma.savingsTransaction.create({
    data: {
      accountId: account.id,
      date: input.date,
      type: input.type,
      amount: input.amount,
      balanceAfter: balanceAfter.toString(),
      source: input.source,
      notes: input.notes,
    },
  });

  await writeAuditLog({
    userId,
    action: "savings.transaction.created",
    entityType: "SavingsTransaction",
    entityId: tx.id,
    newValue: { accountId: account.id, type: input.type, amount: input.amount, date: input.date.toISOString() },
  });

  return tx;
}

export interface SavingsAccountSummary {
  accountId: string;
  name: string;
  balance: Decimal;
  currentTierPercent: Decimal | null;
  estimatedMonthlyInterest: Decimal;
  estimatedAnnualInterest: Decimal;
}

export async function getSavingsAccountSummary(accountId: string): Promise<SavingsAccountSummary> {
  const account = await prisma.savingsAccount.findUniqueOrThrow({
    where: { id: accountId },
    include: { rates: true, transactions: true },
  });
  const bands = ratesToBands(account.rates);
  const balance = currentBalance(account.transactions);
  const tier = findSavingsTier(balance, bands);
  const estimatedMonthlyInterest = calculateMonthlySavingsInterest(balance, bands);

  return {
    accountId: account.id,
    name: account.name,
    balance,
    currentTierPercent: tier ? new Decimal(tier.annualRatePercent) : null,
    estimatedMonthlyInterest,
    estimatedAnnualInterest: estimatedMonthlyInterest.times(12),
  };
}

export async function getEmergencyFundStatus(userId: string) {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId } });
  const accounts = await getSavingsAccountsForUser(userId);
  const totalSavings = accounts.reduce(
    (sum, acc) => sum.plus(currentBalance(acc.transactions)),
    new Decimal(0)
  );
  return calculateEmergencyFundCoverage({
    currentSavings: totalSavings,
    monthlyEssentialExpenses: profile.monthlyEssentials,
    targetMonths: profile.emergencyFundMonthsTarget,
  });
}
