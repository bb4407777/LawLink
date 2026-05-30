/**
 * v0.27: 服务中心
 *
 * 三个 tab：
 * 1. 公告（announcements）— pinned 置顶 + banner 联动
 * 2. 律所资料（firm-files）— 复用 v0.22 firm-files-view 组件
 * 3. 通讯录（contacts）— 同事（User）+ 外部联系人（ExternalContact）
 */
import type { FirmFileCategory } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listFirmFiles } from "@/server/firm-files/actions";
import { listAnnouncements } from "@/server/announcements/actions";
import { listExternalContacts } from "@/server/external-contacts/actions";
import { listExpress } from "@/server/express/actions";
import { getExpressSettings } from "@/lib/express/settings";
import { prisma } from "@/lib/prisma";
import { ServiceCenterView } from "./_components/service-center-view";

const VALID_CATEGORIES: FirmFileCategory[] = ["POLICY", "GUIDE", "TEMPLATE", "REFERENCE"];
const VALID_TABS = ["tools", "express", "firm-files", "announcements", "policy", "contacts"];

export default async function ServiceCenterPage({
  searchParams
}: {
  searchParams: { tab?: string; category?: string; q?: string; includeOld?: string };
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const tab = (
    searchParams.tab && VALID_TABS.includes(searchParams.tab) ? searchParams.tab : "tools"
  ) as "tools" | "express" | "firm-files" | "announcements" | "policy" | "contacts";

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";

  // 公告
  const announcements = await listAnnouncements();

  // 律所资料
  const category =
    searchParams.category && (VALID_CATEGORIES as string[]).includes(searchParams.category)
      ? (searchParams.category as FirmFileCategory)
      : undefined;
  const firmFiles = await listFirmFiles({
    category,
    search: searchParams.q?.trim(),
    includeSuperseded: searchParams.includeOld === "1"
  });

  // 通讯录
  const externalContacts = await listExternalContacts();
  const colleagues = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, phone: true, role: true },
    orderBy: { name: "asc" }
  });

  // 快递跟踪
  const [expressItems, expressMatters, expressSettings] = await Promise.all([
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
    <ServiceCenterView
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
      isManager={isManager}
      tab={tab}
      announcements={announcements}
      firmFiles={firmFiles}
      firmFileCategory={category}
      firmFileSearch={searchParams.q ?? ""}
      includeSuperseded={searchParams.includeOld === "1"}
      colleagues={colleagues}
      externalContacts={externalContacts}
      express={{
        items: expressItems,
        matters: expressMatters,
        configured: expressSettings.kdniao.configured || expressSettings.kuaidi100.configured
      }}
    />
  );
}
