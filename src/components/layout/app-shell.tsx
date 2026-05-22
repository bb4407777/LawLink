import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ll-page-bg min-h-screen">
      <Sidebar />
      <div className="pl-60">
        <Topbar />
        <main className="mx-auto max-w-[1440px] px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
