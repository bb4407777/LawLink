"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import {
  intakeCreateSchema,
  intakeListQuerySchema,
  declineIntakeSchema,
  type IntakeCreateInput,
  type IntakeListQuery,
  type DeclineIntakeInput
} from "./schemas";

function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

export async function listIntakes(input: Partial<IntakeListQuery> = {}) {
  await requireSession();
  const query = intakeListQuerySchema.parse(input);

  const where: Prisma.IntakeWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } },
            { client: { name: { contains: query.search, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    prisma.intake.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        client: { select: { id: true, name: true, type: true } },
        cause: { select: { id: true, name: true } },
        conflictChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
          select: { id: true, conclusion: true, hits: { select: { severity: true } } }
        },
        parties: { where: { role: "OPPOSING_PARTY" }, select: { name: true } },
        matter: { select: { id: true, internalCode: true } }
      }
    }),
    prisma.intake.count({ where })
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getIntakeById(id: string) {
  const session = await requireSession();
  const intake = await prisma.intake.findUnique({
    where: { id },
    include: {
      client: true,
      cause: true,
      parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
      conflictChecks: {
        orderBy: { checkedAt: "desc" },
        include: { hits: true, decidedBy: { select: { id: true, name: true } } }
      },
      matter: { select: { id: true, internalCode: true, title: true } }
    }
  });
  if (intake) {
    await audit({
      userId: session.user.id,
      action: "INTAKE_VIEW",
      targetType: "Intake",
      targetId: id
    });
  }
  return intake;
}

export async function createIntake(input: IntakeCreateInput) {
  const session = await requireSession();
  const data = intakeCreateSchema.parse(input);

  const created = await prisma.intake.create({
    data: {
      title: data.title,
      category: data.category,
      causeId: data.causeId || null,
      causeFreeText: data.causeFreeText || null,
      description: data.description || null,
      source: data.source || null,
      clientId: data.clientId || null,
      createdById: session.user.id,
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
      }
    }
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_CREATE",
    targetType: "Intake",
    targetId: created.id,
    detail: { title: created.title, category: created.category }
  });

  revalidatePath("/intakes");
  return { ok: true, id: created.id };
}

export async function declineIntake(input: DeclineIntakeInput) {
  const session = await requireSession();
  const data = declineIntakeSchema.parse(input);

  await prisma.intake.update({
    where: { id: data.id },
    data: {
      status: "DECLINED",
      declinedReason: data.reason
    }
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_DECLINE",
    targetType: "Intake",
    targetId: data.id,
    detail: { reason: data.reason }
  });

  revalidatePath("/intakes");
  revalidatePath(`/intakes/${data.id}`);
  return { ok: true };
}

/**
 * 把 Intake 转为正式 Matter。
 * - 复制 Intake 的 client / cause / parties / category 到 Matter
 * - 占用一个 internalCode 流水
 * - 创建一个默认首程序（FIRST_INSTANCE / NON_LITIGATION_PHASE 等）
 * - 把 Intake 状态置 CONVERTED 并关联 matterId
 *
 * 实际新建案件还需要补充诉讼地位等，由前端跳转新建案件抽屉填写。
 * 这里提供另一条路径：快速转化（用 Intake 现有信息）。
 */
export async function convertIntakeToMatter(intakeId: string) {
  const session = await requireSession();
  const intake = await prisma.intake.findUnique({
    where: { id: intakeId },
    include: { parties: true }
  });
  if (!intake) throw new Error("Intake 不存在");
  if (intake.status === "CONVERTED") throw new Error("此 Intake 已转化");

  // 用 internalCode 生成器
  const { generateInternalCode } = await import("@/server/matters/code-generator");
  const internalCode = await generateInternalCode(intake.category);

  // 推断首程序类型
  const firstProcedureType =
    intake.category === "CIVIL_COMMERCIAL" ||
    intake.category === "CRIMINAL" ||
    intake.category === "ADMINISTRATIVE"
      ? "FIRST_INSTANCE"
      : "NON_LITIGATION_PHASE";

  const matter = await prisma.$transaction(async (tx) => {
    const m = await tx.matter.create({
      data: {
        internalCode,
        title: intake.title,
        category: intake.category,
        ownerId: session.user.id,
        causeId: intake.causeId,
        causeFreeText: intake.causeFreeText,
        primaryClientId: intake.clientId,
        intakeId: intake.id,
        intakeDate: intake.receivedAt,
        members: { create: { userId: session.user.id, role: "LEAD" } },
        clientLinks: intake.clientId
          ? { create: { clientId: intake.clientId, isPrimary: true, label: "主要委托方" } }
          : undefined,
        parties: {
          create: intake.parties.map((p) => ({
            role: p.role,
            ordinal: p.ordinal,
            name: p.name,
            idNumber: p.idNumber,
            phone: p.phone,
            address: p.address,
            legalRep: p.legalRep,
            notes: p.notes
          }))
        },
        procedures: {
          create: {
            type: firstProcedureType,
            engagement: "ENGAGED",
            order: 1,
            status: "IN_PROGRESS"
          }
        }
      }
    });

    await tx.intake.update({
      where: { id: intake.id },
      data: { status: "CONVERTED" }
    });

    await tx.timelineEvent.create({
      data: {
        matterId: m.id,
        eventType: "MATTER_CREATED",
        title: `案件已创建（来自 Intake）`,
        occurredAt: new Date()
      }
    });

    return m;
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_CONVERT",
    targetType: "Intake",
    targetId: intake.id,
    detail: { matterId: matter.id, internalCode }
  });

  revalidatePath("/intakes");
  revalidatePath(`/intakes/${intake.id}`);
  revalidatePath("/matters");
  return { ok: true, matterId: matter.id, internalCode };
}
