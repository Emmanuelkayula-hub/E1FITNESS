import { z } from "zod";

export const resolveConflictSchema = z.object({
  conflictId: z.string().min(1),
  resolution: z.enum(["accept_a", "accept_b", "keep_both", "mark_stale"]),
  note: z.string().max(2000).optional(),
});

export type ResolveConflictInput = z.infer<typeof resolveConflictSchema>;
