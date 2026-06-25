"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { matterVisibilityFilter } from "@/lib/permissions";

// ============ Types ============

export type OverviewStats = {
  allMatters: number;
  activeMatters: number;
  pendingArchiveMatters: number;
  archivedMatters: number;
  deletedMatters: number;
};

export type CategoryItem = {
  name: string;
  value: number;
  code: string;
  color: string;
};

export type RevenueTrendItem = {
  month: string;
  received: number;
  receivable: number;
};


// ============ Color + Label Map（同 dashboard） ============

const CATEGORY_META: Record<string, { name: string; code: string; color: string }> = {
  CIVIL_COMMERCIAL:       { name: "民商事",   code: "CC", color: "#5B8DEF" },
  LABOR_ARBITRATION:      { name: "劳动仲裁", code: "LA", color: "#34D399" },
  COMMERCIAL_ARBITRATION: { name: "商事仲裁", code: "CA", color: "#F472B6" },
  NON_LITIGATION:         { name: "非诉",     code: "NL", color: "#4FD1C5" },
  LEGAL_COUNSEL:          { name: "顾问",     code: "GC", color: "#9B7BF7" },
  CRIMINAL:               { name: "刑事",     code: "CR", color: "#FB923C" },
  ADMINISTRATIVE:         { name: "行政",     code: "AD", color: "#FBBF24" },
  SPECIAL_PROJECT:        { name: "专项",     code: "SP", color: "#60A5FA" },
  AGENT_FILING:           { name: "代立案",   code: "AF", color: "#E879F9" },
  CONSULTATION:           { name: "咨询",     code: "CT", color: "#22D3EE" },
  PUBLIC_SOURCE:          { name: "公共案源", code: "PS", color: "#FB923C" }
};

// ============ 1. 案件总数统计 ============

export async function getMattersOverviewStats(): Promise<OverviewStats> {
  const session = await requireSession();
  const visFilter = matterVisibilityFilter(session.user.id, session.user.role);

  const [allMatters, activeMatters, pendingArchiveMatters, archivedMatters, deletedMatters] =
    await Promise.all([
      prisma.matter.count({
        where: { deletedAt: null, ...visFilter }
      }),
      prisma.matter.count({
        where: {
          status: { notIn: ["ARCHIVED", "CLOSED", "PENDING_ARCHIVE"] },
          deletedAt: null,
          ...visFilter
        }
      }),
      prisma.matter.count({
        where: { status: "PENDING_ARCHIVE", deletedAt: null, ...visFilter }
      }),
      prisma.matter.count({
        where: { status: "ARCHIVED", deletedAt: null, ...visFilter }
      }),
      prisma.matter.count({
        where: { deletedAt: { not: null }, ...visFilter }
      })
    ]);

  return {
    allMatters,
    activeMatters,
    pendingArchiveMatters,
    archivedMatters,
    deletedMatters
  };
}

// ============ 2. 案件类型分布（全量案件） ============

export async function getMattersCategoryDistribution(): Promise<CategoryItem[]> {
  const session = await requireSession();
  const visFilter = matterVisibilityFilter(session.user.id, session.user.role);

  const groups = await prisma.matter.groupBy({
    by: ["category"],
    where: {
      status: { notIn: ["PENDING_ACCEPTANCE"] },
      deletedAt: null,
      ...visFilter
    },
    _count: { category: true }
  });

  const result = groups.map((g) => {
    const cat = g.category ?? "OTHER";
    const meta = CATEGORY_META[cat] ?? { name: cat, code: cat, color: "#999" };
    return {
      name: meta.name,
      value: g._count.category,
      code: meta.code,
      color: meta.color
    };
  });

  result.sort((a, b) => b.value - a.value);
  return result;
}

// ============ 3. 全程实收趋势 ============

export async function getMattersRevenueTrend(): Promise<RevenueTrendItem[]> {
  const session = await requireSession();
  const visFilter = matterVisibilityFilter(session.user.id, session.user.role);

  // 从 2023 年 8 月开始统计
  const start = new Date(2023, 7, 1); // month 从 0 开始
  const now = new Date();

  // 总月数
  const totalMonths =
    (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1;

  const entries = await prisma.feeEntry.findMany({
    where: {
      type: { in: ["RECEIVABLE", "RECEIVED"] },
      occurredAt: { gte: start },
      matter: { deletedAt: null, ...visFilter }
    },
    select: { type: true, amount: true, occurredAt: true }
  });

  const buckets: RevenueTrendItem[] = [];
  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    buckets.push({
      month: `${d.getFullYear()}年${d.getMonth() + 1}月`,
      received: 0,
      receivable: 0
    });
  }

  for (const e of entries) {
    const d = new Date(e.occurredAt);
    const idx =
      (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth();
    if (idx < 0 || idx >= totalMonths) continue;
    const val = Number(e.amount);
    if (e.type === "RECEIVED") buckets[idx].received += val;
    if (e.type === "RECEIVABLE") buckets[idx].receivable += val;
  }

  for (const b of buckets) {
    b.received = Math.round(b.received);
    b.receivable = Math.round(b.receivable);
  }

  return buckets;
}
