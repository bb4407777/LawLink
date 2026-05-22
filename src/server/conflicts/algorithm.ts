/**
 * 冲突检索算法（V1 内部库）
 *
 * 输入：一组查询项（姓名 / 身份证号 / 信用代码）。
 * 输出：命中列表，每条带严重度。
 *
 * 匹配维度：
 *   - 我方历史客户（Client）的 name / idNumber
 *   - 历史案件当事人（Party）的 name / idNumber
 *
 * 严重度判定：
 *   BLOCKING：拟收案的"相对方"与历史**客户**名称完全一致（不应同时代理）
 *   HIGH    ：身份证号 / 信用代码完全一致
 *   MEDIUM  ：拟收案的"相对方"与历史**对方/第三人**名称完全一致（曾经的对方再次出现）
 *   LOW     ：姓名模糊匹配（包含关系）
 */

import type { Prisma, PartyRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type QueryItem = {
  /** 该查询项在拟收案中的角色：CLIENT_PARTY（我方）/ OPPOSING_PARTY（对方）/ THIRD_PARTY */
  role: PartyRole;
  name: string;
  idNumber?: string;
};

export type ConflictHitDraft = {
  hitType: "HISTORICAL_CLIENT" | "HISTORICAL_PARTY";
  targetType: "Client" | "Matter" | "Party";
  targetId: string;
  matchedName: string;
  matchedField: "name" | "idNumber";
  matchedValue: string;
  matchedRatio: number; // 1 = 精确，<1 = 模糊
  severity: "LOW" | "MEDIUM" | "HIGH" | "BLOCKING";
  reason: string;
};

export async function runConflictCheck(queries: QueryItem[]): Promise<ConflictHitDraft[]> {
  const hits: ConflictHitDraft[] = [];

  for (const q of queries) {
    const name = q.name.trim();
    const idNumber = q.idNumber?.trim() || null;
    if (!name && !idNumber) continue;

    // ============ 历史客户匹配 ============
    const clientWhere: Prisma.ClientWhereInput[] = [];
    if (name) clientWhere.push({ name });
    if (idNumber) clientWhere.push({ idNumber });

    if (clientWhere.length > 0) {
      const clientsExact = await prisma.client.findMany({
        where: { deletedAt: null, OR: clientWhere },
        select: { id: true, name: true, idNumber: true }
      });

      for (const c of clientsExact) {
        if (idNumber && c.idNumber && c.idNumber === idNumber) {
          hits.push({
            hitType: "HISTORICAL_CLIENT",
            targetType: "Client",
            targetId: c.id,
            matchedName: c.name,
            matchedField: "idNumber",
            matchedValue: idNumber,
            matchedRatio: 1,
            severity: "HIGH",
            reason: `身份证 / 信用代码与历史客户「${c.name}」完全一致`
          });
        }
        if (name && c.name === name) {
          const isOpposing = q.role === "OPPOSING_PARTY";
          hits.push({
            hitType: "HISTORICAL_CLIENT",
            targetType: "Client",
            targetId: c.id,
            matchedName: c.name,
            matchedField: "name",
            matchedValue: name,
            matchedRatio: 1,
            severity: isOpposing ? "BLOCKING" : "HIGH",
            reason: isOpposing
              ? `拟收案相对方与历史客户「${c.name}」名称完全一致，可能存在利益冲突`
              : `与历史客户「${c.name}」名称完全一致`
          });
        }
      }

      // 模糊匹配（client name 包含查询名 或 反之），跳过已精确命中
      if (name && name.length >= 2) {
        const exactIds = new Set(clientsExact.map((c) => c.id));
        const clientsFuzzy = await prisma.client.findMany({
          where: {
            deletedAt: null,
            NOT: { id: { in: Array.from(exactIds) } },
            name: { contains: name, mode: "insensitive" }
          },
          select: { id: true, name: true },
          take: 20
        });
        for (const c of clientsFuzzy) {
          hits.push({
            hitType: "HISTORICAL_CLIENT",
            targetType: "Client",
            targetId: c.id,
            matchedName: c.name,
            matchedField: "name",
            matchedValue: name,
            matchedRatio: name.length / c.name.length,
            severity: "LOW",
            reason: `与历史客户「${c.name}」名称相似`
          });
        }
      }
    }

    // ============ 历史案件 Party 匹配 ============
    const partyWhere: Prisma.PartyWhereInput[] = [];
    if (name) partyWhere.push({ name });
    if (idNumber) partyWhere.push({ idNumber });

    if (partyWhere.length > 0) {
      const partiesExact = await prisma.party.findMany({
        where: {
          OR: partyWhere,
          matterId: { not: null },
          matter: { deletedAt: null }
        },
        select: {
          id: true,
          name: true,
          idNumber: true,
          role: true,
          matter: { select: { id: true, internalCode: true, title: true } }
        }
      });

      for (const p of partiesExact) {
        if (!p.matter) continue;
        if (idNumber && p.idNumber && p.idNumber === idNumber) {
          hits.push({
            hitType: "HISTORICAL_PARTY",
            targetType: "Matter",
            targetId: p.matter.id,
            matchedName: p.name,
            matchedField: "idNumber",
            matchedValue: idNumber,
            matchedRatio: 1,
            severity: "HIGH",
            reason: `身份证 / 信用代码与案件「${p.matter.internalCode}」的${roleLabel(p.role)}「${p.name}」一致`
          });
        }
        if (name && p.name === name) {
          // 同名 → MEDIUM；如果是"相对方/我方"互换组合（拟收案对方曾是我方），严重度更高
          let sev: ConflictHitDraft["severity"] = "MEDIUM";
          if (q.role === "OPPOSING_PARTY" && p.role === "CLIENT_PARTY") sev = "HIGH";
          if (q.role === "CLIENT_PARTY" && p.role === "OPPOSING_PARTY") sev = "MEDIUM";

          hits.push({
            hitType: "HISTORICAL_PARTY",
            targetType: "Matter",
            targetId: p.matter.id,
            matchedName: p.name,
            matchedField: "name",
            matchedValue: name,
            matchedRatio: 1,
            severity: sev,
            reason: `与案件「${p.matter.internalCode}」的${roleLabel(p.role)}「${p.name}」同名`
          });
        }
      }

      // Party 姓名模糊匹配（仅限较长姓名，避免"张"误命中过多）
      if (name && name.length >= 3) {
        const partiesFuzzy = await prisma.party.findMany({
          where: {
            matterId: { not: null },
            matter: { deletedAt: null },
            name: { contains: name, mode: "insensitive" },
            NOT: { name }
          },
          select: {
            id: true,
            name: true,
            role: true,
            matter: { select: { id: true, internalCode: true } }
          },
          take: 20
        });
        for (const p of partiesFuzzy) {
          if (!p.matter) continue;
          hits.push({
            hitType: "HISTORICAL_PARTY",
            targetType: "Matter",
            targetId: p.matter.id,
            matchedName: p.name,
            matchedField: "name",
            matchedValue: name,
            matchedRatio: name.length / p.name.length,
            severity: "LOW",
            reason: `与案件「${p.matter.internalCode}」的${roleLabel(p.role)}「${p.name}」名称相似`
          });
        }
      }
    }
  }

  // 去重：同一 (targetType,targetId,matchedField,matchedValue) 只保留最高严重度
  const dedup = new Map<string, ConflictHitDraft>();
  const sevOrder = { BLOCKING: 3, HIGH: 2, MEDIUM: 1, LOW: 0 } as const;
  for (const h of hits) {
    const key = `${h.targetType}-${h.targetId}-${h.matchedField}-${h.matchedValue}`;
    const existing = dedup.get(key);
    if (!existing || sevOrder[h.severity] > sevOrder[existing.severity]) {
      dedup.set(key, h);
    }
  }
  return Array.from(dedup.values()).sort(
    (a, b) => sevOrder[b.severity] - sevOrder[a.severity]
  );
}

function roleLabel(role: PartyRole) {
  switch (role) {
    case "CLIENT_PARTY":
      return "委托方";
    case "OPPOSING_PARTY":
      return "对方";
    case "THIRD_PARTY":
      return "第三人";
    case "CO_LITIGANT":
      return "共同诉讼人";
    case "AGENT":
      return "代理人";
    case "WITNESS":
      return "证人";
    default:
      return "当事人";
  }
}
