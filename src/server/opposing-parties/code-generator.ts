import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * v0.46: 原子生成对方当事人编号 DF-{YYYY}-{4位流水}
 */
export async function generateOpposingPartyCode(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `opposing-party-code-counter-${year}`;

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
  return `DF-${year}-${padded}`;
}
