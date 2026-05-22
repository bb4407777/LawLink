"use server";

import type { MatterCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

/**
 * 搜索规范案由库。
 *
 * - 必传 category（民事/刑事/行政等）以收窄结果
 * - 空 query 时返回该 category 下前 N 条常用案由（level=3）
 * - 模糊匹配 name / shortName / keywords / pinyin
 */
export async function searchCauses(params: {
  category: MatterCategory;
  query?: string;
  limit?: number;
}) {
  await requireSession();
  const limit = Math.min(params.limit ?? 30, 100);
  const q = params.query?.trim();

  if (!q) {
    return prisma.causeOfAction.findMany({
      where: {
        category: params.category,
        active: true,
        level: { gte: 3 }
      },
      orderBy: [{ level: "asc" }, { code: "asc" }],
      take: limit,
      select: { id: true, code: true, name: true, shortName: true, level: true }
    });
  }

  return prisma.causeOfAction.findMany({
    where: {
      category: params.category,
      active: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { shortName: { contains: q, mode: "insensitive" } },
        { keywords: { has: q } },
        { pinyin: { contains: q, mode: "insensitive" } }
      ]
    },
    orderBy: [{ level: "asc" }, { code: "asc" }],
    take: limit,
    select: { id: true, code: true, name: true, shortName: true, level: true }
  });
}

export async function getCauseById(id: string) {
  await requireSession();
  return prisma.causeOfAction.findUnique({
    where: { id },
    select: { id: true, code: true, name: true, shortName: true, level: true, category: true }
  });
}
