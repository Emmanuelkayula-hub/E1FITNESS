import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/data/auditLog";

export async function getDataSourcesForUser(userId: string) {
  return prisma.dataSource.findMany({
    where: { userId },
    include: { observations: { orderBy: { observedAt: "desc" } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getConflictsForUser(userId: string, status?: string) {
  const conflicts = await prisma.dataConflict.findMany({
    where: { userId, ...(status ? { status: status as never } : {}) },
    orderBy: { createdAt: "desc" },
  });

  // Hydrate each side's observation + source (small N, simple sequential fetch
  // is fine — this page is not on a hot path).
  const hydrated = await Promise.all(
    conflicts.map(async (c) => {
      const [obsA, obsB] = await Promise.all([
        prisma.dataObservation.findUnique({ where: { id: c.observationAId }, include: { source: true } }),
        prisma.dataObservation.findUnique({ where: { id: c.observationBId }, include: { source: true } }),
      ]);
      return { conflict: c, obsA, obsB };
    })
  );

  return hydrated;
}

const RESOLUTION_TO_STATUS: Record<string, string> = {
  accept_a: "ACCEPTED_A",
  accept_b: "ACCEPTED_B",
  keep_both: "KEPT_BOTH",
  mark_stale: "MARKED_STALE",
};

export async function resolveConflict(params: {
  userId: string;
  conflictId: string;
  resolution: "accept_a" | "accept_b" | "keep_both" | "mark_stale";
  note?: string;
}) {
  const { userId, conflictId, resolution, note } = params;
  const status = RESOLUTION_TO_STATUS[resolution];
  const before = await prisma.dataConflict.findUniqueOrThrow({ where: { id: conflictId } });

  const updated = await prisma.dataConflict.update({
    where: { id: conflictId },
    data: { status: status as never, resolutionNote: note, resolvedAt: new Date() },
  });

  await writeAuditLog({
    userId,
    action: "conflict.resolved",
    entityType: "DataConflict",
    entityId: conflictId,
    previousValue: { status: before.status },
    newValue: { status, resolution, note },
    reason: note,
  });

  return updated;
}

export async function getFundResearchProfiles(userId: string) {
  return prisma.investmentFund.findMany({
    where: { userId },
    include: { researchProfile: true },
  });
}
