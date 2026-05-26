import type { FirmFileCategory } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listFirmFiles } from "@/server/firm-files/actions";
import { FirmFilesView } from "./_components/firm-files-view";

const VALID_CATEGORIES: FirmFileCategory[] = ["POLICY", "GUIDE", "TEMPLATE", "REFERENCE"];

export default async function FirmResourcesPage({
  searchParams
}: {
  searchParams: { category?: string; q?: string; includeOld?: string };
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const category =
    searchParams.category &&
    (VALID_CATEGORIES as string[]).includes(searchParams.category)
      ? (searchParams.category as FirmFileCategory)
      : undefined;
  const search = searchParams.q?.trim();
  const includeSuperseded = searchParams.includeOld === "1";

  const files = await listFirmFiles({ category, search, includeSuperseded });

  const canUpload =
    session.user.role === "ADMIN" || session.user.role === "PRINCIPAL_LAWYER";

  return (
    <FirmFilesView
      files={files}
      canUpload={canUpload}
      currentCategory={category}
      currentSearch={search ?? ""}
      includeSuperseded={includeSuperseded}
    />
  );
}
