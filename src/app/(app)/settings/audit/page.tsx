import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAuditLogs } from "@/server/settings/actions";
import { listUsers } from "@/server/users/actions";
import { AuditView } from "./_components/audit-view";

type Props = {
  searchParams: { action?: string; userId?: string; days?: string };
};

export default async function AuditPage({ searchParams }: Props) {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") redirect("/settings/profile");

  const [{ items, distinctActions }, users] = await Promise.all([
    listAuditLogs({
      action: searchParams.action,
      userId: searchParams.userId,
      days: searchParams.days ? Number(searchParams.days) : 30
    }),
    listUsers()
  ]);

  return (
    <AuditView
      items={items}
      distinctActions={distinctActions}
      userOptions={users.map((u) => ({ id: u.id, name: u.name }))}
      initialFilters={{
        action: searchParams.action ?? "ALL",
        userId: searchParams.userId ?? "ALL",
        days: searchParams.days ?? "30"
      }}
    />
  );
}
