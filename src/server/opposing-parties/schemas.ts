import { z } from "zod";
import { PartyType } from "@prisma/client";

export const opposingPartyCreateSchema = z.object({
  name: z.string().min(1, "名称必填").max(120),
  partyType: z.nativeEnum(PartyType).default("NATURAL_PERSON"),
  idNumber: z.string().max(50).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  legalRep: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  tags: z.array(z.string().max(20)).default([])
});

export const opposingPartyUpdateSchema = opposingPartyCreateSchema.extend({
  id: z.string()
});

export type OpposingPartyCreateInput = z.infer<typeof opposingPartyCreateSchema>;
export type OpposingPartyUpdateInput = z.infer<typeof opposingPartyUpdateSchema>;

export const opposingPartyListQuerySchema = z.object({
  search: z.string().optional(),
  partyType: z.nativeEnum(PartyType).optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type OpposingPartyListQuery = z.infer<typeof opposingPartyListQuerySchema>;
