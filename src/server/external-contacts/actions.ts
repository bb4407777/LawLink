"use server";

/**
 * v0.27: 服务中心 - 外部联系人通讯录
 *
 * 范围：法院 / 检察院 / 公证 / 仲裁 / 他所律师 / 鉴定专家 / 其他外部联系
 * 同事用 User 表，不在此（前端可一并展示）。
 *
 * 权限：所有登录用户可看，可新建；仅创建者本人 / ADMIN / 主任 可改可归档。
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

const categories = [
  "COURT",
  "PROSECUTOR",
  "POLICE",
  "NOTARY",
  "ARBITRATION",
  "OTHER_FIRM",
  "EXPERT",
  "OTHER"
] as const;

const externalContactSchema = z.object({
  name: z.string().min(1, "姓名必填").max(60),
  category: z.enum(categories),
  organization: z.string().max(120).optional().or(z.literal("")),
  title: z.string().max(60).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().max(80).optional().or(z.literal("")),
  wechat: z.string().max(60).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  tags: z.array(z.string().max(30)).default([])
});

const externalContactUpdateSchema = externalContactSchema.extend({
  id: z.string().cuid()
});

function empty(s?: string | null) {
  return s && s.trim() !== "" ? s.trim() : null;
}

export async function listExternalContacts(
  filter: { category?: (typeof categories)[number] | "ALL"; search?: string } = {}
) {
  await requireSession();
  const where: Record<string, unknown> = { archivedAt: null };
  if (filter.category && filter.category !== "ALL") {
    where.category = filter.category;
  }
  if (filter.search && filter.search.trim()) {
    const q = filter.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { organization: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } }
    ];
  }
  return prisma.externalContact.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { createdBy: { select: { id: true, name: true } } }
  });
}

async function assertCanModify(id: string, sessionUserId: string, role: string) {
  const c = await prisma.externalContact.findUnique({
    where: { id },
    select: { createdById: true }
  });
  if (!c) throw new Error("联系人不存在");
  const allowed =
    role === "ADMIN" || role === "PRINCIPAL_LAWYER" || c.createdById === sessionUserId;
  if (!allowed) throw new Error("无权修改此联系人");
}

export async function createExternalContact(input: z.infer<typeof externalContactSchema>) {
  const session = await requireSession();
  const data = externalContactSchema.parse(input);
  const created = await prisma.externalContact.create({
    data: {
      name: data.name.trim(),
      category: data.category,
      organization: empty(data.organization),
      title: empty(data.title),
      phone: empty(data.phone),
      email: empty(data.email),
      wechat: empty(data.wechat),
      address: empty(data.address),
      notes: empty(data.notes),
      tags: data.tags,
      createdById: session.user.id
    }
  });
  await audit({
    userId: session.user.id,
    action: "EXTERNAL_CONTACT_CREATE",
    targetType: "ExternalContact",
    targetId: created.id,
    detail: { name: created.name, category: created.category }
  });
  revalidatePath("/contacts");
  return created;
}

export async function updateExternalContact(input: z.infer<typeof externalContactUpdateSchema>) {
  const session = await requireSession();
  const data = externalContactUpdateSchema.parse(input);
  await assertCanModify(data.id, session.user.id, session.user.role);
  const updated = await prisma.externalContact.update({
    where: { id: data.id },
    data: {
      name: data.name.trim(),
      category: data.category,
      organization: empty(data.organization),
      title: empty(data.title),
      phone: empty(data.phone),
      email: empty(data.email),
      wechat: empty(data.wechat),
      address: empty(data.address),
      notes: empty(data.notes),
      tags: data.tags
    }
  });
  await audit({
    userId: session.user.id,
    action: "EXTERNAL_CONTACT_UPDATE",
    targetType: "ExternalContact",
    targetId: data.id,
    detail: { name: updated.name }
  });
  revalidatePath("/contacts");
  return updated;
}

export async function archiveExternalContact(id: string) {
  const session = await requireSession();
  await assertCanModify(id, session.user.id, session.user.role);
  await prisma.externalContact.update({
    where: { id },
    data: { archivedAt: new Date() }
  });
  await audit({
    userId: session.user.id,
    action: "EXTERNAL_CONTACT_ARCHIVE",
    targetType: "ExternalContact",
    targetId: id
  });
  revalidatePath("/contacts");
}
