import { z } from "zod";

export const savingsTransactionSchema = z.object({
  accountId: z.string().min(1),
  date: z.coerce.date(),
  type: z.enum(["deposit", "withdrawal", "interest"]),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  source: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type SavingsTransactionInput = z.infer<typeof savingsTransactionSchema>;
