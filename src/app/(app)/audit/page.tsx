import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAuditLogs, getAuditFilterOptions } from "@/server/audit-list";
import { AuditView } from "./_components/audit-view";

export default async function AuditPage({
  searchParams
}: {
  searchParams: Promise<{
    userId?: string;
    action?: string;
    targetType?: string;
    start?: string;
    end?: string;
    cursor?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    redirect("/");
  }

  const filter = {
    userId: sp.userId,
    action: sp.action,
    targetType: sp.targetType,
    startStr: sp.start,
    endStr: sp.end,
    cursor: sp.cursor,
    limit: 50
  };

  const [result, options] = await Promise.all([
    listAuditLogs(filter),
    getAuditFilterOptions()
  ]);

  return <AuditView result={result} options={options} currentFilter={filter} />;
}
