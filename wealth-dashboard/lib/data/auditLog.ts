import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Records a change per spec §48 (Audit Log). Never throws into the caller's
 *  mutation path silently — if audit logging fails, the caller should know. */
export async function writeAuditLog(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  reason?: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      previousValue: params.previousValue ?? undefined,
      newValue: params.newValue ?? undefined,
      reason: params.reason,
    },
  });
}
