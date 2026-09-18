import { prisma } from "@/lib/prisma";
import { getFundsForUser } from "@/lib/data/investments";
import { getLiquiditySummary, getEmergencyFundStatus } from "@/lib/data/dashboard";
import { describeConflictField } from "@/lib/data/entityLabels";
import { daysUntil, formatMoney } from "@/lib/format";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  severity: AlertSeverity;
  title: string;
  detail: string;
}

async function getSetting<T>(userId: string, key: string, fallback: T): Promise<T> {
  const row = await prisma.applicationSetting.findUnique({ where: { userId_key: { userId, key } } });
  return row ? (row.value as T) : fallback;
}

/** Computes the spec §6 "Alerts" list from real data — never a static/demo list. */
export async function computeAlerts(userId: string): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();

  const staleDays = await getSetting(userId, "dataFreshnessMarketDataStaleDays", 5);

  // Upcoming investment unlock
  const liquidity = await getLiquiditySummary(userId);
  if (liquidity.nextUnlock) {
    const days = daysUntil(liquidity.nextUnlock.date, now);
    if (days <= 60 && days >= 0) {
      alerts.push({
        severity: days <= 14 ? "warning" : "info",
        title: "Upcoming investment unlock",
        detail: `${formatMoney(liquidity.nextUnlock.amount)} unlocks in ${days} day(s), on the lot's contribution-date-plus-lock-period.`,
      });
    }
  }

  // Emergency fund below target
  const emergencyFund = await getEmergencyFundStatus(userId);
  if (emergencyFund.percentageFunded.lt(100)) {
    alerts.push({
      severity: emergencyFund.percentageFunded.lt(50) ? "warning" : "info",
      title: "Emergency fund below target",
      detail: `Funded at ${emergencyFund.percentageFunded.toFixed(1)}% of target (${emergencyFund.monthsCovered
        .toNumber()
        .toFixed(1)} months covered).`,
    });
  }

  // Data discrepancy detected
  const openConflicts = await prisma.dataConflict.findMany({
    where: { userId, status: "OPEN" },
  });
  for (const conflict of openConflicts) {
    const label = await describeConflictField(conflict.entityType, conflict.entityId, conflict.field);
    alerts.push({
      severity: "critical",
      title: "Data discrepancy detected",
      detail: `${label}: two sources disagree${
        conflict.difference ? ` by ${conflict.difference.toString()}` : ""
      }. Review in Research.`,
    });
  }

  // Stale unit price / missing contribution price
  const funds = await getFundsForUser(userId);
  for (const fund of funds) {
    const latestPrice = fund.priceHistory[0] ?? null;
    if (!latestPrice) {
      if (fund.lots.length > 0) {
        alerts.push({
          severity: "warning",
          title: "Missing current unit price",
          detail: `${fund.name} has contributions but no recorded price observation — current value cannot be calculated.`,
        });
      }
      continue;
    }
    const ageDays = Math.floor((now.getTime() - latestPrice.date.getTime()) / (24 * 60 * 60 * 1000));
    if (ageDays > staleDays) {
      alerts.push({
        severity: ageDays > staleDays * 4 ? "warning" : "info",
        title: "Stale unit price",
        detail: `${fund.name}'s latest price observation is ${ageDays} days old (from ${latestPrice.source}).`,
      });
    }
  }

  // External source unavailable — static note since no live provider is wired up (spec §3/§58)
  alerts.push({
    severity: "info",
    title: "No live external data source configured",
    detail:
      "Market and fund prices are entered manually or via CSV import. There is no automated LuSE/Longhorn feed.",
  });

  return alerts;
}
