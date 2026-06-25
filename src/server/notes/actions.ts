"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { assertMatterWritable } from "@/lib/archive/guard";
import { assertCanAccessMatter } from "@/lib/permissions";

const noteChannelSchema = z.enum(["PHONE", "WECHAT", "EMAIL", "MEETING", "COURT", "OTHER"]);

const noteCreateSchema = z.object({
  matterId: z.string(),
  channel: noteChannelSchema.default("OTHER"),
  withWhom: z.string().max(80).optional().or(z.literal("")),
  occurredAt: z.coerce.date().default(() => new Date()),
  content: z.string().min(1, "内容不能为空").max(5000),
  tags: z.array(z.string().max(20)).default([])
});

const noteUpdateSchema = noteCreateSchema.extend({
  id: z.string()
});

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;

export async function createNote(input: NoteCreateInput) {
  const session = await requireSession();
  const data = noteCreateSchema.parse(input);
  await assertCanAccessMatter(session.user.id, session.user.role, data.matterId);
  await assertMatterWritable(data.matterId);

  const created = await prisma.note.create({
    data: {
      matterId: data.matterId,
      authorId: session.user.id,
      channel: data.channel,
      withWhom: data.withWhom || null,
      occurredAt: data.occurredAt,
      content: data.content,
      tags: data.tags
    }
  });

  await audit({
    userId: session.user.id,
    action: "NOTE_CREATE",
    targetType: "Note",
    targetId: created.id,
    detail: { matterId: data.matterId, channel: data.channel }
  });

  // 法院短信 → 自动创建待办任务
  if (data.channel === "COURT" && data.matterId) {
    const courtName = data.withWhom || "法院";
    const taskDefs = [
      { title: `📄 下载文书 - ${courtName}`, priority: 2 },
      { title: `📬 送达当事人 - ${courtName}`, priority: 2 }
    ];
    const existingTasks = await prisma.task.findMany({
      where: {
        matterId: data.matterId,
        completed: false,
        title: { in: taskDefs.map(t => t.title) }
      },
      select: { title: true }
    });
    const existingTitles = new Set(existingTasks.map(t => t.title));

    for (const def of taskDefs) {
      if (existingTitles.has(def.title)) continue;
      const dateStr = data.occurredAt.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
      const descWithDate = `📅 ${dateStr}\n${data.content}`;
      const task = await prisma.task.create({
        data: {
          matterId: data.matterId,
          title: def.title,
          description: descWithDate.slice(0, 2000),
          priority: def.priority,
          assigneeId: session.user.id
        }
      });
      await audit({
        userId: session.user.id,
        action: "TASK_CREATE",
        targetType: "Task",
        targetId: task.id,
        detail: { matterId: data.matterId, title: task.title }
      });
      await prisma.timelineEvent.create({
        data: {
          matterId: data.matterId,
          eventType: "TASK_ADDED",
          title: `新增事项：${task.title}`,
          occurredAt: new Date(),
          refType: "Task",
          refId: task.id
        }
      });
    }
  }

  revalidatePath(`/matters/${data.matterId}`);
  return { ok: true, id: created.id };
}

export async function updateNote(input: NoteUpdateInput) {
  const session = await requireSession();
  const data = noteUpdateSchema.parse(input);

  const existing = await prisma.note.findUnique({ where: { id: data.id } });
  if (!existing) throw new Error("办案记录不存在");
  if (existing.authorId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("只能编辑自己的办案记录");
  }
  await assertMatterWritable(existing.matterId);

  await prisma.note.update({
    where: { id: data.id },
    data: {
      channel: data.channel,
      withWhom: data.withWhom || null,
      occurredAt: data.occurredAt,
      content: data.content,
      tags: data.tags
    }
  });

  await audit({
    userId: session.user.id,
    action: "NOTE_UPDATE",
    targetType: "Note",
    targetId: data.id
  });

  revalidatePath(`/matters/${existing.matterId}`);
  return { ok: true };
}

export async function deleteNote(id: string) {
  const session = await requireSession();
  const existing = await prisma.note.findUnique({ where: { id } });
  if (!existing) return { ok: false };
  if (existing.authorId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("只能删除自己的办案记录");
  }
  await assertMatterWritable(existing.matterId);

  await prisma.note.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await audit({
    userId: session.user.id,
    action: "NOTE_DELETE",
    targetType: "Note",
    targetId: id
  });

  revalidatePath(`/matters/${existing.matterId}`);
  return { ok: true };
}

export async function listNotes(matterId: string) {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, matterId);
  return prisma.note.findMany({
    where: { matterId, deletedAt: null },
    orderBy: { occurredAt: "desc" },
    include: { author: { select: { id: true, name: true } } }
  });
}
