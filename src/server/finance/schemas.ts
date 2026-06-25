import { z } from "zod";

export const feeEntryTypeSchema = z.enum([
  "RECEIVABLE",
  "RECEIVED",
  "REFUND",
  "COST",
  "COMMISSION"
]);

export const billingStatusSchema = z.enum(["DRAFT", "ACTIVE", "CLOSED"]);

export const billingCreateSchema = z.object({
  matterId: z.string(),
  title: z.string().min(1, "合同名称必填").max(120),
  contractAmount: z.coerce.number().nonnegative(),
  schedule: z.string().max(1000).optional().or(z.literal("")),
  status: billingStatusSchema.default("DRAFT"),
  signedAt: z.coerce.date().optional()
});

export const feeEntryCreateSchema = z.object({
  matterId: z.string(),
  billingId: z.string().optional().or(z.literal("")),
  type: feeEntryTypeSchema,
  amount: z.coerce.number(),
  occurredAt: z.coerce.date().default(() => new Date()),
  invoiceNo: z.string().max(50).optional().or(z.literal("")),
  payerOrPayee: z.string().max(80).optional().or(z.literal("")),
  method: z.string().max(40).optional().or(z.literal("")),
  note: z.string().max(500).optional().or(z.literal(""))
});

export const feeEntryUpdateSchema = z.object({
  id: z.string(),
  billingId: z.string().optional().or(z.literal("")),
  type: feeEntryTypeSchema.optional(),
  amount: z.coerce.number().optional(),
  occurredAt: z.coerce.date().optional(),
  matterId: z.string().optional(),
  invoiceNo: z.string().max(50).optional().or(z.literal("")),
  payerOrPayee: z.string().max(80).optional().or(z.literal("")),
  method: z.string().max(40).optional().or(z.literal("")),
  note: z.string().max(500).optional().or(z.literal(""))
});

export const commissionPlanSetSchema = z.object({
  matterId: z.string(),
  items: z
    .array(
      z.object({
        userId: z.string(),
        percent: z.coerce.number().min(0).max(100),
        label: z.string().max(40).optional().or(z.literal(""))
      })
    )
    .default([])
});

export type BillingCreateInput = z.infer<typeof billingCreateSchema>;
export type FeeEntryCreateInput = z.infer<typeof feeEntryCreateSchema>;
export type FeeEntryUpdateInput = z.infer<typeof feeEntryUpdateSchema>;
export type CommissionPlanSetInput = z.infer<typeof commissionPlanSetSchema>;
