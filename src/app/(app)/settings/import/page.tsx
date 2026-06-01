import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { MatterImportView } from "./_components/matter-import-view";

export default async function MatterImportPage() {
  const session = await getSession();
  const role = session?.user.role;
  if (role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") redirect("/settings/profile");
  return <MatterImportView />;
}
