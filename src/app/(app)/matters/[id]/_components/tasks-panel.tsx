"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Trash2,
  Check,
  Flame,
  CircleAlert,
  Circle
} from "lucide-react";
import type { Task } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { createTask, toggleTaskCompleted, deleteTask } from "@/server/tasks/actions";
import { cn, formatDate, daysUntil } from "@/lib/utils";

const formSchema = z.object({
  matterId: z.string().cuid(),
  title: z.string().min(1, "任务标题必填").max(200),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().optional(),
  dueAt: z.coerce.date().optional(),
  priority: z.coerce.number().int().min(0).max(2)
});

type FormValues = z.infer<typeof formSchema>;

type UserOption = { id: string; name: string; role: string };

const priorityMeta = {
  0: { icon: Circle, color: "#9BA8C7", label: "普通" },
  1: { icon: CircleAlert, color: "#FBBF24", label: "紧急" },
  2: { icon: Flame, color: "#F87171", label: "阻塞" }
} as const;

export function TasksPanel({
  matterId,
  tasks,
  userOptions
}: {
  matterId: string;
  tasks: Task[];
  userOptions: UserOption[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pending = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  function handleToggle(id: string) {
    startTransition(async () => {
      try {
        await toggleTaskCompleted(id);
      } catch {
        toast.error("操作失败");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("删除此任务？")) return;
    startTransition(async () => {
      try {
        await deleteTask(id);
        toast.success("已删除");
      } catch {
        toast.error("删除失败");
      }
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          待办 <span className="font-mono tabular text-foreground">{pending.length}</span> ·
          已完成 <span className="font-mono tabular text-muted-foreground">{done.length}</span>
        </p>
        <Button
          onClick={() => setSheetOpen(true)}
          size="sm"
          className="gap-1.5 shadow-[0_0_24px_-6px_rgba(91,141,239,0.45)]"
        >
          <Plus className="h-4 w-4" />
          新增任务
        </Button>
      </header>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/20 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            还没有任务。点击 <span className="text-foreground">新增任务</span> 开始
          </p>
        </div>
      ) : (
        <>
          <TasksGroup
            title="待办"
            tasks={pending}
            userMap={Object.fromEntries(userOptions.map((u) => [u.id, u]))}
            onToggle={handleToggle}
            onDelete={handleDelete}
            isPending={isPending}
          />
          {done.length > 0 && (
            <TasksGroup
              title="已完成"
              tasks={done}
              userMap={Object.fromEntries(userOptions.map((u) => [u.id, u]))}
              onToggle={handleToggle}
              onDelete={handleDelete}
              isPending={isPending}
              muted
            />
          )}
        </>
      )}

      <TaskSheet
        matterId={matterId}
        userOptions={userOptions}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

function TasksGroup({
  title,
  tasks,
  userMap,
  onToggle,
  onDelete,
  isPending,
  muted
}: {
  title: string;
  tasks: Task[];
  userMap: Record<string, UserOption>;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
  muted?: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-card/40">
      <header className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold">
          {title}{" "}
          <span className="font-mono text-xs tabular text-muted-foreground">
            ({tasks.length})
          </span>
        </h3>
      </header>
      <ul className="divide-y divide-border">
        {tasks.map((t) => {
          const days = t.dueAt ? daysUntil(t.dueAt) : null;
          const isOverdue = !t.completed && days !== null && days < 0;
          const isWarn = !t.completed && days !== null && days >= 0 && days <= 2;
          const Priority = priorityMeta[t.priority as 0 | 1 | 2];
          const assignee = t.assigneeId ? userMap[t.assigneeId] : null;
          return (
            <li
              key={t.id}
              className={cn(
                "group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-popover/40",
                muted && "opacity-60"
              )}
            >
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                disabled={isPending}
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  t.completed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:border-primary"
                )}
                aria-label={t.completed ? "标记未完成" : "标记完成"}
              >
                {t.completed && <Check className="h-2.5 w-2.5" />}
              </button>

              <div className="flex-1 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      t.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {t.title}
                  </span>
                  {t.priority > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{ borderColor: `${Priority.color}50`, color: Priority.color }}
                    >
                      <Priority.icon className="mr-0.5 h-2.5 w-2.5" />
                      {Priority.label}
                    </Badge>
                  )}
                  {assignee && (
                    <Badge variant="secondary" className="text-[10px]">
                      @ {assignee.name}
                    </Badge>
                  )}
                </div>
                {t.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                )}
              </div>

              {t.dueAt && (
                <div
                  className={cn(
                    "text-right font-mono text-xs tabular",
                    isOverdue
                      ? "text-destructive"
                      : isWarn
                        ? "text-[#FBBF24]"
                        : "text-muted-foreground"
                  )}
                >
                  {t.completed ? (
                    <span>已完成</span>
                  ) : isOverdue ? (
                    <span>逾期 {-(days ?? 0)} 天</span>
                  ) : days === 0 ? (
                    <span>今天</span>
                  ) : (
                    <span>{days ?? 0} 天</span>
                  )}
                  <div className="font-mono text-[10px] text-muted-foreground tabular">
                    {formatDate(t.dueAt)}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onDelete(t.id)}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="删除"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TaskSheet({
  matterId,
  userOptions,
  open,
  onOpenChange
}: {
  matterId: string;
  userOptions: UserOption[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      matterId,
      title: "",
      description: "",
      assigneeId: "",
      dueAt: undefined,
      priority: 0
    }
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        await createTask({
          matterId: values.matterId,
          title: values.title,
          description: values.description,
          assigneeId: values.assigneeId,
          dueAt: values.dueAt,
          priority: values.priority
        });
        toast.success("任务已创建");
        reset({
          matterId,
          title: "",
          description: "",
          assigneeId: "",
          dueAt: undefined,
          priority: 0
        });
        onOpenChange(false);
      } catch (err) {
        toast.error("创建失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  const priority = watch("priority");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border bg-background/60 px-6 py-4 backdrop-blur">
          <SheetTitle>新增任务</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <Field label="任务标题" required error={errors.title?.message}>
              <Input placeholder="如：拟答辩状" {...register("title")} />
            </Field>

            <Field label="描述">
              <Textarea
                rows={3}
                placeholder="任务具体说明、要点、参考资料等"
                {...register("description")}
              />
            </Field>

            <Field label="到期日">
              <Input type="date" {...register("dueAt", { valueAsDate: true })} />
            </Field>

            <Field label="指派给">
              <Select
                value={watch("assigneeId") || "none"}
                onValueChange={(v) =>
                  setValue("assigneeId", v === "none" ? "" : v, { shouldDirty: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未指派</SelectItem>
                  {userOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="优先级">
              <div className="grid grid-cols-3 gap-1.5">
                {([0, 1, 2] as const).map((p) => {
                  const meta = priorityMeta[p];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setValue("priority", p)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors",
                        priority === p
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-background/40 text-muted-foreground hover:border-input"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <SheetFooter className="border-t border-border bg-background/60 px-6 py-4 backdrop-blur">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              创建任务
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  error,
  children
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
