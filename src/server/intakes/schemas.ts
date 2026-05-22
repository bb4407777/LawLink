import { z } from "zod";
import { matterCategorySchema, partyInputSchema } from "@/server/matters/schemas";

export const intakeStatusSchema = z.enum([
  "INTAKE",
  "PENDING_CONFIRMATION",
  "CONVERTED",
  "DECLINED"
]);

export const intakeCreateSchema = z.object({
  title: z.string().min(1, "案件标题必填").max(200),
  category: matterCategorySchema,
  causeId: z.string().cuid().optional().or(z.literal("")),
  causeFreeText: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  source: z.string().max(80).optional().or(z.literal("")),
  clientId: z.string().cuid().optional().or(z.literal("")),
  parties: z.array(partyInputSchema).default([])
});

export const intakeUpdateSchema = intakeCreateSchema.extend({
  id: z.string().cuid()
});

export const intakeListQuerySchema = z.object({
  search: z.string().optional(),
  status: intakeStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const declineIntakeSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().min(1, "请填写不接案原因").max(500)
});

export type IntakeCreateInput = z.infer<typeof intakeCreateSchema>;
export type IntakeListQuery = z.infer<typeof intakeListQuerySchema>;
export type DeclineIntakeInput = z.infer<typeof declineIntakeSchema>;
