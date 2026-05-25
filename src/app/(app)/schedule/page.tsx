import { prisma } from "@/lib/prisma";
import { matterVisibilityFilter } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { listScheduleItems } from "@/server/schedule/actions";
import { ScheduleView } from "./_components/schedule-view";

export default async function SchedulePage() {
  // 拉前后各 3 个月覆盖月历前后翻页
  const session = await getSession();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 4, 1);

  const [items, matters] = await Promise.all([
    listScheduleItems({ from, to }),
    prisma.matter.findMany({
      where: {
        deletedAt: null,
        ...(session ? matterVisibilityFilter(session.user.id, session.user.role) : {}),
        status: { notIn: ["ARCHIVED"] }
      },
      select: { id: true, internalCode: true, title: true },
      orderBy: { updatedAt: "desc" },
      take: 200
    })
  ]);

  return <ScheduleView items={items} matters={matters} />;
}
