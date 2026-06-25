import { Prisma } from "@prisma/client";
import type { MatterCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matterCategoryCode } from "@/lib/procedures-by-category";
import { getFirmProfile, CATEGORY_ABBR } from "@/server/settings/firm-profile";
import { renderCaseNoTemplate } from "@/lib/matters/firm-caseno";

/** SystemSetting 原子计数器：key 自增并返回新值（serializable 防并发冲突） */
async function nextCounter(key: string): Promise<number> {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.systemSetting.findUnique({ where: { key } });
      const current = (existing?.value as { value?: number })?.value ?? 0;
      const incremented = current + 1;
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: { value: incremented } },
        create: { key, value: { value: incremented } }
      });
      return incremented;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * 芙蓉所案号规则（所有类型均为 MMNN 月+月内流水）：
 * - 民/刑/非诉：共享月计数器
 * - 咨询、代立案等：各自独立月计数器
 * seq = month * 100 + counter，模板 {序4} 渲染为 MMNN。
 */
export async function generateInternalCode(category: MatterCategory): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const profile = await getFirmProfile();

  // 共享 MMNN 池：民/刑/非/劳仲/商仲 共用"民"字案号
  const sharedTypes: MatterCategory[] = [
    "CIVIL_COMMERCIAL", "CRIMINAL", "NON_LITIGATION",
    "LABOR_ARBITRATION", "COMMERCIAL_ARBITRATION"
  ];
  const counterKey = sharedTypes.includes(category)
    ? `firm-caseno-${year}-${String(month).padStart(2, "0")}`
    : `firm-caseno-${year}-${String(month).padStart(2, "0")}-${matterCategoryCode[category]}`;

  const counter = await nextCounter(counterKey);
  const seq = month * 100 + counter;

  // 劳仲/商仲案号也用"民"字
  const abbr = ["LABOR_ARBITRATION", "COMMERCIAL_ARBITRATION"].includes(category)
    ? "民"
    : CATEGORY_ABBR[category];

  return renderCaseNoTemplate(profile.caseNoTemplate, {
    year,
    firmShortName: profile.firmShortName,
    categoryAbbr: abbr,
    categoryWord: profile.categoryWords[category],
    seq
  });
}
