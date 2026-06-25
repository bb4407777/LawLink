import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function generatePotentialClientCode(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `potential-client-code-counter-${year}`;
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
  return `PC-${year}-${padded}`;
}
