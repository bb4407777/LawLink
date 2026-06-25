"use server";

import Link from "next/link";
import { ChevronRight, CheckCircle2, CheckCheck, Trash2 } from "lucide-react";
import { listMyTasks, toggleTaskCompleted, deleteTask } from "@/server/tasks/actions";
import { cn } from "@/lib/utils";
import { TaskEditDialog } from "./task-edit-dialog";
export async function TasksList({ completed = false }: { completed?: boolean }) {
  const tasks = await listMyTasks(completed);

  if (tasks.length === 0) {
    return <p className="py-20 text-center text-sm text-muted-foreground">{completed ? "暂无已完成事项" : "暂无待办事项"}</p>;
  }

  return (
    <ul className="space-y-3">
      {tasks.map((t, i) => (
        <li key={t.id} className={cn(
          "group flex items-start gap-5 rounded-lg border px-6 py-7 transition-colors",
          completed ? "border-border/50 bg-muted/20" : "border-border bg-card hover:bg-muted/30"
        )}>
          <span className="mt-1 w-6 shrink-0 text-right text-base font-bold font-mono tabular-nums text-muted-foreground/60">{i + 1}</span>
          <form action={toggleTaskCompleted.bind(null, t.id)} className="mt-1">
            <button type="submit" className="shrink-0">
              {completed
                ? <CheckCheck className="h-6 w-6 text-muted-foreground/40" />
                : <CheckCircle2 className="h-6 w-6 text-muted-foreground/40 transition-colors hover:text-emerald-500" />}
            </button>
          </form>

          <div className="min-w-0 flex-1 space-y-2">
            <div className={cn(completed && "opacity-50")}>
              <span className={cn("text-[15px] leading-relaxed", completed ? "text-muted-foreground line-through" : "font-medium")}>{t.title}</span>
            </div>
            {t.matter ? (
              <Link href={`/matters/${t.matter.id}`} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-primary">
                <span className="font-mono">{t.matter.internalCode}</span>
                <span className="truncate">{t.matter.title}</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
              </Link>
            ) : (
              <span className="text-[13px] text-muted-foreground/40">未关联案件</span>
            )}
            {t.description && (
              <div className="pt-1 text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{t.description}</div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 pt-1">
            {t.dueAt && (
              <span className={cn("shrink-0 text-xs font-mono tabular-nums", new Date(t.dueAt) < new Date() && !completed ? "text-red-500 font-bold" : "text-muted-foreground/60")}>
                {new Date(t.dueAt).toLocaleDateString("zh-CN", { year: "numeric", month: "numeric", day: "numeric", weekday: "short" })}
              </span>
            )}
            <div className="flex items-start gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <TaskEditDialog
                task={{ id: t.id, title: t.title, description: t.description ?? "", dueAt: t.dueAt, matterId: t.matterId, matterTitle: t.matter?.title ?? "" }}
              />
              <form action={deleteTask.bind(null, t.id)}>
                <button type="submit" className="rounded-md p-2 text-muted-foreground/50 transition-colors hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
