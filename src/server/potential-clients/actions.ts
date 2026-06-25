"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";
import { audit } from "@/server/audit";
import { generatePotentialClientCode } from "./code-generator";
import {
  potentialClientCreateSchema,
  potentialClientUpdateSchema,
  potentialClientListQuerySchema,
  type PotentialClientCreateInput,
  type PotentialClientUpdateInput
} from "./schemas";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

function emptyToNull(v: string | undefined | null): string | null {
  if (v == null || v === "") return null;
  return v;
}

export async function listPotentialClients(input: { search?: string; page?: number; pageSize?: number } = {}) {
  await requireSession();
  const query = potentialClientListQuerySchema.parse(input);

  const where: Prisma.PotentialClientWhereInput = { deletedAt: null };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search } },
      { idNumber: { contains: query.search } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.potentialClient.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { updatedAt: "desc" }
    }),
    prisma.potentialClient.count({ where })
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getPotentialClientById(id: string) {
  await requireSession();
  return prisma.potentialClient.findFirst({ where: { id, deletedAt: null } });
}

export async function createPotentialClient(input: PotentialClientCreateInput) {
  const session = await requireSession();
  const data = potentialClientCreateSchema.parse(input);
  const internalCode = await generatePotentialClientCode();

  const pc = await prisma.potentialClient.create({
    data: {
      name: data.name,
      type: data.type,
      phone: emptyToNull(data.phone),
      gender: data.gender ?? null,
      idNumber: emptyToNull(data.idNumber),
      address: emptyToNull(data.address),
      email: emptyToNull(data.email),
      legalRep: emptyToNull(data.legalRep),
      ethnicity: emptyToNull(data.ethnicity),
      industry: emptyToNull(data.industry),
      wechat: emptyToNull(data.wechat),
      douyin: emptyToNull(data.douyin),
      source: emptyToNull(data.source),
      notes: emptyToNull(data.notes),
      tags: data.tags,
      contactedAt: data.contactedAt ?? null,
      internalCode
    }
  });

  await audit({ userId: session.user.id, action: "POTENTIAL_CLIENT_CREATE", targetType: "PotentialClient", targetId: pc.id });
  revalidatePath("/potential-clients");
  return { ok: true, id: pc.id };
}

export async function updatePotentialClient(input: PotentialClientUpdateInput) {
  const session = await requireSession();
  if (!isManager(session.user.role)) throw new Error("只有管理员或主办律师可以编辑");
  const data = potentialClientUpdateSchema.parse(input);

  const pc = await prisma.potentialClient.update({
    where: { id: data.id },
    data: {
      name: data.name,
      type: data.type,
      phone: emptyToNull(data.phone),
      gender: data.gender ?? null,
      idNumber: emptyToNull(data.idNumber),
      address: emptyToNull(data.address),
      email: emptyToNull(data.email),
      legalRep: emptyToNull(data.legalRep),
      ethnicity: emptyToNull(data.ethnicity),
      industry: emptyToNull(data.industry),
      wechat: emptyToNull(data.wechat),
      douyin: emptyToNull(data.douyin),
      source: emptyToNull(data.source),
      notes: emptyToNull(data.notes),
      tags: data.tags,
      contactedAt: data.contactedAt ?? null
    }
  });

  await audit({ userId: session.user.id, action: "POTENTIAL_CLIENT_UPDATE", targetType: "PotentialClient", targetId: pc.id });
  revalidatePath("/potential-clients");
  revalidatePath(`/potential-clients/${data.id}`);
  return { ok: true, id: pc.id };
}

export async function softDeletePotentialClient(id: string) {
  const session = await requireSession();
  if (!isManager(session.user.role)) throw new Error("只有管理员或主办律师可以删除");
  await prisma.potentialClient.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ userId: session.user.id, action: "POTENTIAL_CLIENT_DELETE", targetType: "PotentialClient", targetId: id });
  revalidatePath("/potential-clients");
  return { ok: true };
}
