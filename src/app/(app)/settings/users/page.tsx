import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listUsers } from "@/server/users/actions";
import { UsersView } from "./_components/users-view";

export default async function UsersPage() {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") {
    redirect("/settings/profile");
  }

  const users = await listUsers();
  return <UsersView users={users} currentUserId={session.user.id} />;
}
