import { z } from "zod";

export const contributionSchema = z.object({
  fundId: z.string().min(1),
  date: z.coerce.date(),
  amount: z.coerce.number().positive("Contribution amount must be greater than zero."),
  unitPriceAtPurchase: z.coerce.number().positive("Unit price must be greater than zero."),
  fees: z.coerce.number().min(0).default(0),
  source: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const fundPriceSchema = z.object({
  fundId: z.string().min(1),
  date: z.coerce.date(),
  unitPrice: z.coerce.number().positive("Unit price must be greater than zero."),
  source: z.string().min(1, "Source is required."),
  sourceType: z.enum(["OFFICIAL", "USER_DOCUMENT", "MANUAL", "THIRD_PARTY"]),
  verificationStatus: z.enum([
    "VERIFIED",
    "OFFICIAL",
    "USER_INPUT",
    "ASSUMPTION",
    "UNVERIFIED",
    "CONFLICTING",
    "ESTIMATED",
    "STALE",
  ]),
  notes: z.string().max(2000).optional(),
});

export type ContributionInput = z.infer<typeof contributionSchema>;
export type FundPriceInput = z.infer<typeof fundPriceSchema>;
