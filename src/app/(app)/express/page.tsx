/**
 * v0.38: 快递跟踪恢复独立页（v0.37 曾并入 /service-center，现拆回）
 */
import { listExpress } from "@/server/express/actions";
import { getExpressSettings } from "@/lib/express/settings";
import { prisma } from "@/lib/prisma";
import { ExpressView } from "./_components/express-view";

export default async function ExpressPage() {
  const [items, matters, s] = await Promise.all([
    listExpress({ scope: "all", direction: "ALL" }),
    prisma.matter.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, internalCode: true, title: true }
    }),
    getExpressSettings()
  ]);

  return (
    <ExpressView
      items={items}
      matters={matters}
      configured={s.kdniao.configured || s.kuaidi100.configured}
    />
  );
}
