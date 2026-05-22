import { Prisma } from "@prisma/client";
import type { MatterCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { matterCategoryCode } from "@/lib/procedures-by-category";

/**
 * 原子生成 internalCode：LL-{YYYY}-{CODE}-{4位流水}
 *
 * 计数器存在 SystemSetting，key 形如 `code-counter-2026-CC`。
 * 用 Prisma transaction + serializable 隔离避免并发冲突。
 */
export async function generateInternalCode(category: MatterCategory): Promise<string> {
  const year = new Date().getFullYear();
  const code = matterCategoryCode[category];
  const key = `code-counter-${year}-${code}`;

  const next = await prisma.$transaction(
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

  const padded = String(next).padStart(4, "0");
  return `LL-${year}-${code}-${padded}`;
}
