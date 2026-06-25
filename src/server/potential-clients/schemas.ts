import { z } from "zod";

export const potentialClientCreateSchema = z.object({
  name: z.string().min(1, "名称必填").max(120),
  type: z.enum(["INDIVIDUAL", "COMPANY", "ORGANIZATION"]).default("INDIVIDUAL"),
  phone: z.string().max(30).optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE"]).optional().nullable(),
  idNumber: z.string().max(18).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  email: z.string().max(80).optional().or(z.literal("")),
  legalRep: z.string().max(60).optional().or(z.literal("")),
  ethnicity: z.string().max(20).optional().or(z.literal("")),
  industry: z.string().max(60).optional().or(z.literal("")),
  wechat: z.string().max(40).optional().or(z.literal("")),
  douyin: z.string().max(40).optional().or(z.literal("")),
  source: z.string().max(80).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  tags: z.array(z.string().max(20)).default([]),
  contactedAt: z.coerce.date().optional().nullable()
});

export const potentialClientUpdateSchema = potentialClientCreateSchema.extend({
  id: z.string()
});

export type PotentialClientCreateInput = z.infer<typeof potentialClientCreateSchema>;
export type PotentialClientUpdateInput = z.infer<typeof potentialClientUpdateSchema>;

export const potentialClientListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

export type PotentialClientListQuery = z.infer<typeof potentialClientListQuerySchema>;
