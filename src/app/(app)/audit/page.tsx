import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAuditLogs, getAuditFilterOptions } from "@/server/audit-list";
import { AuditView } from "./_components/audit-view";

export default async function AuditPage({
  searchParams
}: {
  searchParams: {
    userId?: string;
    action?: string;
    targetType?: string;
    start?: string;
    end?: string;
    cursor?: string;
  };
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    redirect("/");
  }

  const filter = {
    userId: searchParams.userId,
    action: searchParams.action,
    targetType: searchParams.targetType,
    startStr: searchParams.start,
    endStr: searchParams.end,
    cursor: searchParams.cursor,
    limit: 50
  };

  const [result, options] = await Promise.all([
    listAuditLogs(filter),
    getAuditFilterOptions()
  ]);

  return <AuditView result={result} options={options} currentFilter={filter} />;
}
