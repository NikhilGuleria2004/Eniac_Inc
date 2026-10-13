import { z } from "zod";

const payFrequencyEnum = z.enum(["MONTHLY", "YEARLY", "HOURLY"] as const);
const billRateUnitEnum = z.enum(["HOURLY", "DAILY", "MONTHLY"] as const);

const moneyAmount = z.coerce.number().positive();

export const updateCompensationSchema = z.object({
  salary: z
    .object({
      currency: z.string().min(1).max(10),
      amount: moneyAmount,
      payFrequency: payFrequencyEnum
    })
    .optional(),
  billRate: z
    .object({
      currency: z.string().min(1).max(10),
      amount: moneyAmount,
      unit: billRateUnitEnum
    })
    .optional(),
  reason: z.string().max(500).optional()
}).refine((data) => data.salary !== undefined || data.billRate !== undefined, {
  message: "At least one of salary or billRate must be provided.",
  path: ["salary"]
});

export type UpdateCompensationInput = z.infer<typeof updateCompensationSchema>;

export { payFrequencyEnum, billRateUnitEnum };
