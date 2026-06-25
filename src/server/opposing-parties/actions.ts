"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { isManager } from "@/lib/permissions";
import { audit } from "@/server/audit";
import { generateOpposingPartyCode } from "./code-generator";
import {
  opposingPartyCreateSchema,
  opposingPartyUpdateSchema,
  opposingPartyListQuerySchema,
  type OpposingPartyCreateInput,
  type OpposingPartyUpdateInput,
  type OpposingPartyListQuery
} from "./schemas";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

function emptyToNull(v: string | undefined | null): string | null {
  if (v == null || v === "") return null;
  return v;
}

// ============ 列表 ============

export async function listOpposingParties(input: Partial<OpposingPartyListQuery> = {}) {
  await requireSession();
  const query = opposingPartyListQuerySchema.parse(input);

  const where: Prisma.OpposingPartyWhereInput = {
    deletedAt: null
  };

  if (query.partyType) {
    where.partyType = query.partyType;
  }

  if (query.tag) {
    where.tags = { has: query.tag };
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { idNumber: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.opposingParty.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { parties: true } }
      }
    }),
    prisma.opposingParty.count({ where })
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

// ============ 详情 ============

export async function getOpposingPartyById(id: string) {
  await requireSession();

  const op = await prisma.opposingParty.findFirst({
    where: { id, deletedAt: null },
    include: {
      parties: {
        where: { matter: { deletedAt: null } },
        include: {
          matter: {
            select: { id: true, internalCode: true, title: true, category: true, status: true }
          }
        },
        orderBy: { matter: { updatedAt: "desc" } },
        take: 50
      }
    }
  });

  return op;
}

// ============ 新增 ============

export async function createOpposingParty(input: OpposingPartyCreateInput) {
  const session = await requireSession();
  if (!isManager(session.user.role)) {
    throw new Error("只有管理员或主办律师可以新增对方当事人");
  }

  const data = opposingPartyCreateSchema.parse(input);
  const internalCode = await generateOpposingPartyCode();

  const op = await prisma.opposingParty.create({
    data: {
      name: data.name,
      partyType: data.partyType,
      idNumber: emptyToNull(data.idNumber),
      phone: emptyToNull(data.phone),
      address: emptyToNull(data.address),
      legalRep: emptyToNull(data.legalRep),
      notes: emptyToNull(data.notes),
      tags: data.tags,
      internalCode
    }
  });

  await audit({
    userId: session.user.id,
    action: "OPPOSING_PARTY_CREATE",
    targetType: "OpposingParty",
    targetId: op.id,
    detail: { name: op.name, partyType: op.partyType }
  });

  revalidatePath("/opposing-parties");
  return { ok: true, id: op.id };
}

// ============ 更新 ============

export async function updateOpposingParty(input: OpposingPartyUpdateInput) {
  const session = await requireSession();
  if (!isManager(session.user.role)) {
    throw new Error("只有管理员或主办律师可以编辑对方当事人");
  }

  const data = opposingPartyUpdateSchema.parse(input);

  const op = await prisma.opposingParty.update({
    where: { id: data.id },
    data: {
      name: data.name,
      partyType: data.partyType,
      idNumber: emptyToNull(data.idNumber),
      phone: emptyToNull(data.phone),
      address: emptyToNull(data.address),
      legalRep: emptyToNull(data.legalRep),
      notes: emptyToNull(data.notes),
      tags: data.tags
    }
  });

  await audit({
    userId: session.user.id,
    action: "OPPOSING_PARTY_UPDATE",
    targetType: "OpposingParty",
    targetId: op.id,
    detail: { name: op.name }
  });

  revalidatePath("/opposing-parties");
  revalidatePath(`/opposing-parties/${data.id}`);
  return { ok: true, id: op.id };
}

// ============ 软删除 ============

export async function softDeleteOpposingParty(id: string) {
  const session = await requireSession();
  if (!isManager(session.user.role)) {
    throw new Error("只有管理员或主办律师可以删除对方当事人");
  }

  await prisma.opposingParty.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await audit({
    userId: session.user.id,
    action: "OPPOSING_PARTY_DELETE",
    targetType: "OpposingParty",
    targetId: id
  });

  revalidatePath("/opposing-parties");
  return { ok: true };
}
