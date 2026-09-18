import { z } from "zod";

export const marketIndexSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  date: z.coerce.date(),
  level: z.coerce.number().positive("Index level must be greater than zero."),
  source: z.string().min(1, "Source is required."),
});

export type MarketIndexInput = z.infer<typeof marketIndexSchema>;
