/**
 * v0.38: 制度规范独立页（律所文书里的 POLICY 分类，只列文件、不显分类筛选）
 */
import { redirect } from "next/navigation";
import { BookText } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { listFirmFiles } from "@/server/firm-files/actions";
import { FirmFilesView } from "@/app/(app)/firm-resources/_components/firm-files-view";

export default async function PolicyPage({
  searchParams
}: {
  searchParams: { q?: string; includeOld?: string };
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const isManager =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";

  const files = await listFirmFiles({
    category: "POLICY",
    search: searchParams.q?.trim(),
    includeSuperseded: searchParams.includeOld === "1"
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="flex items-center gap-2 text-xl">
          <BookText className="h-5 w-5 text-primary" strokeWidth={1.8} />
          制度规范
        </h1>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          全所制度文件（员工手册、保密协议、薪酬制度等）。{isManager ? "管理员可上传与版本替代" : "管理员上传"}
        </p>
      </header>

      <FirmFilesView
        files={files}
        canUpload={isManager}
        currentCategory="POLICY"
        currentSearch={searchParams.q ?? ""}
        includeSuperseded={searchParams.includeOld === "1"}
        basePath="/policy"
        hideHeader
        hideCategoryNav
      />
    </div>
  );
}
