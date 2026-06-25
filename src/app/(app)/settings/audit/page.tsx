import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAuditLogs } from "@/server/settings/actions";
import { listUsers } from "@/server/users/actions";
import { AuditView } from "./_components/audit-view";

type Props = {
  searchParams: Promise<{ action?: string; userId?: string; days?: string }>;
};

export default async function AuditPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await getSession();
  if (session?.user.role !== "ADMIN") redirect("/settings/profile");

  const [{ items, distinctActions }, users] = await Promise.all([
    listAuditLogs({
      action: sp.action,
      userId: sp.userId,
      days: sp.days ? Number(sp.days) : 30
    }),
    listUsers()
  ]);

  return (
    <AuditView
      items={items}
      distinctActions={distinctActions}
      userOptions={users.map((u) => ({ id: u.id, name: u.name }))}
      initialFilters={{
        action: sp.action ?? "ALL",
        userId: sp.userId ?? "ALL",
        days: sp.days ?? "30"
      }}
    />
  );
}
