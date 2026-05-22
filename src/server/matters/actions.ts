"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { generateInternalCode } from "./code-generator";
import {
  matterCreateSchema,
  matterListQuerySchema,
  type MatterCreateInput,
  type MatterListQuery
} from "./schemas";

function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

export async function listMatters(input: Partial<MatterListQuery> = {}) {
  await requireSession();
  const query = matterListQuerySchema.parse(input);

  const where: Prisma.MatterWhereInput = {
    deletedAt: null,
    ...(query.category ? { category: query.category } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.clientId ? { primaryClientId: query.clientId } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: "insensitive" } },
            { internalCode: { contains: query.search, mode: "insensitive" } },
            { primaryClient: { name: { contains: query.search, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    prisma.matter.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        primaryClient: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        cause: { select: { id: true, name: true } },
        procedures: {
          where: { engagement: "ENGAGED" },
          orderBy: { order: "desc" },
          take: 1,
          select: { id: true, type: true, caseNumber: true, status: true }
        },
        _count: { select: { procedures: true } }
      }
    }),
    prisma.matter.count({ where })
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getMatterById(id: string) {
  const session = await requireSession();
  const matter = await prisma.matter.findFirst({
    where: { id, deletedAt: null },
    include: {
      primaryClient: { include: { contacts: { where: { isPrimary: true }, take: 1 } } },
      clientLinks: { include: { client: { select: { id: true, name: true, type: true } } } },
      owner: { select: { id: true, name: true, role: true } },
      members: {
        include: { user: { select: { id: true, name: true, role: true } } }
      },
      cause: true,
      parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
      relatedEntities: { orderBy: { createdAt: "asc" } },
      procedures: {
        orderBy: { order: "asc" },
        include: {
          deadlines: { orderBy: [{ completed: "asc" }, { dueAt: "asc" }] },
          hearings: { orderBy: { startsAt: "asc" } },
          stages: { orderBy: { order: "asc" } }
        }
      },
      tasks: {
        orderBy: [{ completed: "asc" }, { dueAt: "asc" }]
      },
      timelineEvents: { orderBy: { occurredAt: "desc" }, take: 50 }
    }
  });

  if (matter) {
    await audit({
      userId: session.user.id,
      action: "MATTER_VIEW",
      targetType: "Matter",
      targetId: id
    });
  }
  return matter;
}

export async function createMatter(input: MatterCreateInput) {
  const session = await requireSession();
  const data = matterCreateSchema.parse(input);

  const internalCode = await generateInternalCode(data.category);
  const [primaryClientId, ...otherClientIds] = data.clientIds;

  const created = await prisma.$transaction(async (tx) => {
    const matter = await tx.matter.create({
      data: {
        internalCode,
        title: data.title,
        category: data.category,
        ownerId: session.user.id,

        ...emptyToNull({
          causeId: data.causeId,
          causeFreeText: data.causeFreeText
        }),

        claimAmount: data.claimAmount ?? undefined,
        ourStanding: data.ourStanding,
        counterclaimAsPlaintiff: data.counterclaimAsPlaintiff,
        counterclaimAsDefendant: data.counterclaimAsDefendant,
        intakeDate: data.intakeDate ?? new Date(),

        primaryClientId,

        // 主办律师默认是创建者
        members: {
          create: { userId: session.user.id, role: "LEAD" }
        },

        // 多客户关联表
        clientLinks: {
          create: data.clientIds.map((cid, idx) => ({
            clientId: cid,
            isPrimary: idx === 0,
            label: idx === 0 ? "主要委托方" : `委托方 ${idx + 1}`
          }))
        },

        // 当事人
        parties: {
          create: data.parties.map((p) =>
            emptyToNull({
              role: p.role,
              ordinal: p.ordinal,
              name: p.name,
              idNumber: p.idNumber,
              phone: p.phone,
              address: p.address,
              legalRep: p.legalRep,
              notes: p.notes
            })
          )
        },

        // 首程序
        procedures: {
          create: {
            type: data.firstProcedure.type,
            customLabel: data.firstProcedure.customLabel || null,
            engagement: "ENGAGED",
            order: 1,
            caseNumber: data.firstProcedure.caseNumber || null,
            handlingAgency: data.firstProcedure.handlingAgency || null,
            acceptedAt: data.firstProcedure.acceptedAt,
            status: "IN_PROGRESS"
          }
        },

        firstAcceptedAt: data.firstProcedure.acceptedAt
      }
    });

    // TimelineEvent: 案件创建
    await tx.timelineEvent.create({
      data: {
        matterId: matter.id,
        eventType: "MATTER_CREATED",
        title: "案件已创建",
        occurredAt: new Date()
      }
    });

    // 标记 otherClientIds 避免被 lint 误判未用
    void otherClientIds;

    return matter;
  });

  await audit({
    userId: session.user.id,
    action: "MATTER_CREATE",
    targetType: "Matter",
    targetId: created.id,
    detail: { internalCode: created.internalCode, title: created.title }
  });

  revalidatePath("/matters");
  return { ok: true, id: created.id, internalCode: created.internalCode };
}

export async function softDeleteMatter(id: string) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("只有管理员或主办律师可以删除案件");
  }

  await prisma.matter.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await audit({
    userId: session.user.id,
    action: "MATTER_DELETE",
    targetType: "Matter",
    targetId: id
  });

  revalidatePath("/matters");
  return { ok: true };
}
