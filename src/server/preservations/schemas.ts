import { z } from "zod";

const presTypes = ["PRE_LITIGATION", "LITIGATION", "ENFORCEMENT"] as const;
const propertyTypes = [
  "BANK_DEPOSIT",
  "REAL_ESTATE",
  "VEHICLE",
  "EQUITY",
  "IP",
  "OTHER"
] as const;
const guaranteeTypes = ["CASH_DEPOSIT", "GUARANTEE_LETTER", "PROPERTY", "NONE"] as const;
const presStatuses = ["ACTIVE", "RENEWED", "EXPIRED", "LIFTED"] as const;

export const preservationCreateSchema = z.object({
  matterId: z.string().cuid().optional().nullable(),
  type: z.enum(presTypes),
  propertyType: z.enum(propertyTypes),
  amount: z.coerce.number().nonnegative().optional().nullable(),
  respondent: z.string().min(1, "被保全人必填").max(200),
  guaranteeType: z.enum(guaranteeTypes).optional().nullable(),

  appliedAt: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date(),
  duration: z.coerce.number().int().positive().max(3650),
  expiryDate: z.coerce.date(),

  court: z.string().max(80).optional().or(z.literal("")),
  rulingNumber: z.string().max(80).optional().or(z.literal("")),
  propertyDetail: z.string().max(500).optional().or(z.literal("")),
  note: z.string().max(500).optional().or(z.literal("")),

  ownerId: z.string().cuid().optional().nullable(),
  remindDays: z.array(z.coerce.number().int().positive()).default([30, 15, 7, 3, 1])
});

export const preservationUpdateSchema = preservationCreateSchema.partial().extend({
  id: z.string().cuid()
});

export const preservationListFilterSchema = z.object({
  status: z.enum([...presStatuses, "ALL"]).default("ALL"),
  matterId: z.string().cuid().optional(),
  search: z.string().max(80).optional().or(z.literal(""))
});

export const preservationRenewSchema = z.object({
  id: z.string().cuid(),
  newExpiryDate: z.coerce.date(),
  renewalDuration: z.coerce.number().int().positive(),
  note: z.string().max(300).optional().or(z.literal(""))
});

export const preservationLiftSchema = z.object({
  id: z.string().cuid(),
  note: z.string().max(300).optional().or(z.literal(""))
});

export const preservationIdSchema = z.object({ id: z.string().cuid() });
