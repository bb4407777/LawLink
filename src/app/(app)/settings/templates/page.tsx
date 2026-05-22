import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listStageTemplates } from "@/server/settings/actions";
import { TemplatesView } from "./_components/templates-view";

export default async function TemplatesPage() {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") redirect("/settings/profile");

  const templates = await listStageTemplates();
  return <TemplatesView templates={templates} />;
}
