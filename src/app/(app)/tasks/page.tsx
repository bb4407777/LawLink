import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TasksList } from "./_components/tasks-list";
import { TaskCreateForm } from "./_components/task-create-form";

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function TasksPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = sp.tab === "done" ? "done" : "todo";

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium tracking-tight">待办事项</h1>
        <TaskCreateForm />
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        <Link
          href="/tasks"
          className={cn(
            "relative inline-flex items-center gap-1.5 rounded-t-md px-3 pb-2.5 pt-2 text-[13px] transition-colors",
            tab === "todo" ? "bg-card text-primary font-medium border border-b-transparent border-border" : "text-muted-foreground hover:bg-muted/60"
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />待办
        </Link>
        <Link
          href="/tasks?tab=done"
          className={cn(
            "relative inline-flex items-center gap-1.5 rounded-t-md px-3 pb-2.5 pt-2 text-[13px] transition-colors",
            tab === "done" ? "bg-card text-primary font-medium border border-b-transparent border-border" : "text-muted-foreground hover:bg-muted/60"
          )}
        >
          <Circle className="h-3.5 w-3.5" />已完成
        </Link>
      </div>

      <TasksList completed={tab === "done"} />
    </div>
  );
}
