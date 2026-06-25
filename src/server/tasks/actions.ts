"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import type { Prisma } from "@prisma/client";
import { createNotification } from "@/server/notifications/create";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAssociateMatter } from "@/lib/permissions";

const taskCreateSchema = z.object({
  matterId: z.string().optional().nullable(),
  title: z.string().min(1, "事项标题必填").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  assigneeId: z.string().optional().or(z.literal("")),
  dueAt: z.coerce.date().optional(),
  priority: z.coerce.number().int().min(0).max(2).default(0),
  stageId: z.string().optional().or(z.literal(""))
});

const taskUpdateSchema = taskCreateSchema.extend({
  id: z.string()
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

export async function listMyTasks(completed: boolean = false) {
  const session = await requireSession();
  const tasks = await prisma.task.findMany({
    where: {
      completed,
      OR: [
        { matter: { deletedAt: null } },
        { matter: null }
      ]
    },
    orderBy: completed
      ? [{ completedAt: "desc" }]
      : [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      matter: { select: { id: true, internalCode: true, title: true } }
    }
  });
  return tasks;
}

export async function createTask(input: TaskCreateInput) {
  const session = await requireSession();
  const data = taskCreateSchema.parse(input);

  if (data.matterId) {
    await assertCanAssociateMatter(session.user.id, data.matterId);
    await assertMatterWritable(data.matterId);
  }

  const created = await prisma.task.create({
    data: {
      matterId: data.matterId ?? null,
      title: data.title,
      description: data.description || null,
      assigneeId: data.assigneeId || null,
      dueAt: data.dueAt,
      priority: data.priority,
      stageId: data.stageId || null
    }
  });

  await audit({
    userId: session.user.id,
    action: "TASK_CREATE",
    targetType: "Task",
    targetId: created.id,
    detail: { matterId: data.matterId, title: created.title }
  });

  // 关联案件时写入案件动态时间线
  if (data.matterId) {
    await prisma.timelineEvent.create({
      data: {
        matterId: data.matterId,
        eventType: "TASK_ADDED",
        title: `新增事项：${created.title}`,
        occurredAt: new Date(),
        refType: "Task",
        refId: created.id
      }
    });
  }

  // 通知被指派人（非创建者本人时）
  if (data.assigneeId && data.assigneeId !== session.user.id && data.matterId) {
    await createNotification({
      userId: data.assigneeId,
      type: "TASK_ASSIGNED",
      title: "您有新事项",
      content: `事项「${created.title}」已指派给您`,
      href: `/matters/${data.matterId}`,
      refType: "Task",
      refId: created.id
    });
  }

  if (data.matterId) revalidatePath(`/matters/${data.matterId}`);
  return { ok: true, id: created.id };
}

export async function updateTask(input: TaskUpdateInput) {
  const session = await requireSession();
  const data = taskUpdateSchema.parse(input);
  if (data.matterId) {
    await assertCanAssociateMatter(session.user.id, data.matterId);
    await assertMatterWritable(data.matterId);
  }
  const { id, matterId, ...rest } = data;

  await prisma.task.update({
    where: { id },
    data: {
      matterId: matterId ?? null,
      title: rest.title,
      description: rest.description || null,
      assigneeId: rest.assigneeId || null,
      dueAt: rest.dueAt,
      priority: rest.priority,
      stageId: rest.stageId || null
    }
  });

  await audit({
    userId: session.user.id,
    action: "TASK_UPDATE",
    targetType: "Task",
    targetId: id
  });

  if (matterId) revalidatePath(`/matters/${matterId}`);
  return { ok: true };
}

export async function toggleTaskCompleted(id: string) {
  const session = await requireSession();
  const current = await prisma.task.findUnique({ where: { id } });
  if (!current) return { ok: false };
  if (current.matterId) {
    await assertCanAssociateMatter(session.user.id, current.matterId);
    await assertMatterWritable(current.matterId);
  }

  const next = !current.completed;
  await prisma.task.update({
    where: { id },
    data: {
      completed: next,
      completedAt: next ? new Date() : null
    }
  });

  await audit({
    userId: session.user.id,
    action: next ? "TASK_COMPLETE" : "TASK_REOPEN",
    targetType: "Task",
    targetId: id
  });

  if (current.matterId) revalidatePath(`/matters/${current.matterId}`);
  revalidatePath("/tasks");
  return { ok: true };
}

export async function deleteTask(id: string) {
  const session = await requireSession();
  const current = await prisma.task.findUnique({ where: { id } });
  if (!current) return { ok: false };
  if (current.matterId) {
    await assertCanAssociateMatter(session.user.id, current.matterId);
    await assertMatterWritable(current.matterId);
  }

  await prisma.task.delete({ where: { id } });

  await audit({
    userId: session.user.id,
    action: "TASK_DELETE",
    targetType: "Task",
    targetId: id
  });

  if (current.matterId) revalidatePath(`/matters/${current.matterId}`);
  revalidatePath("/tasks");
  return { ok: true };
}
