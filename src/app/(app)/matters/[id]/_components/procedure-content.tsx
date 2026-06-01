"use client";

import { useState, useTransition } from "react";
import {
  Calendar,
  AlertTriangle,
  Plus,
  Gavel,
  Check,
  Trash2,
  Loader2,
  StickyNote,
  ClipboardList
} from "lucide-react";
import type {
  Deadline,
  Hearing,
  MatterStage,
  MatterProcedure,
  ProcedureMemo
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn, daysUntil } from "@/lib/utils";
import {
  toggleDeadlineCompleted,
  deleteDeadline,
  deleteHearing,
  addProcedureMemo,
  toggleProcedureMemo,
  deleteProcedureMemo
} from "@/server/procedures/actions";
import { AddDeadlineSheet, AddHearingSheet } from "./procedure-forms";

type ProcedureWithChildren = MatterProcedure & {
  deadlines: Deadline[];
  hearings: Hearing[];
  stages: MatterStage[];
  memos: ProcedureMemo[];
};

export function ProcedureContent({ procedure }: { procedure: ProcedureWithChildren }) {
  const [deadlineSheetOpen, setDeadlineSheetOpen] = useState(false);
  const [hearingSheetOpen, setHearingSheetOpen] = useState(false);

  const isInformational = procedure.engagement === "INFORMATIONAL";

  return (
    <div className="space-y-4">
      {/* INFORMATIONAL 程序不显示重要时限、备忘录（按设计） */}
      {!isInformational && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 左半：重要时限（合并开庭 + 各类期限） */}
          <DeadlinesCard
            deadlines={procedure.deadlines}
            hearings={procedure.hearings}
            onAddDeadline={() => setDeadlineSheetOpen(true)}
            onAddHearing={() => setHearingSheetOpen(true)}
          />

          {/* 右半：备忘录 */}
          <MemosCard procedureId={procedure.id} memos={procedure.memos} />
        </div>
      )}

      <AddDeadlineSheet
        open={deadlineSheetOpen}
        onOpenChange={setDeadlineSheetOpen}
        procedureId={procedure.id}
      />
      <AddHearingSheet
        open={hearingSheetOpen}
        onOpenChange={setHearingSheetOpen}
        procedureId={procedure.id}
      />
    </div>
  );
}

// ============ 重要时限（开庭 + 期限分组）============

function DeadlinesCard({
  deadlines,
  hearings,
  onAddDeadline,
  onAddHearing
}: {
  deadlines: Deadline[];
  hearings: Hearing[];
  onAddDeadline: () => void;
  onAddHearing: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string) {
    startTransition(async () => {
      try {
        await toggleDeadlineCompleted(id);
      } catch {
        toast.error("操作失败");
      }
    });
  }

  function handleDeleteDeadline(id: string) {
    if (!confirm("删除这条期限？")) return;
    startTransition(async () => {
      try {
        await deleteDeadline(id);
        toast.success("已删除");
      } catch {
        toast.error("删除失败");
      }
    });
  }

  function handleDeleteHearing(id: string) {
    if (!confirm("删除这条开庭记录？")) return;
    startTransition(async () => {
      try {
        await deleteHearing(id);
        toast.success("已删除");
      } catch {
        toast.error("删除失败");
      }
    });
  }

  // 期限分组：举证 / 保全 / 其他
  const evidence = deadlines.filter((d) => d.category === "EVIDENCE");
  const preservation = deadlines.filter((d) => d.category === "PRESERVATION");
  const others = deadlines.filter(
    (d) => d.category !== "EVIDENCE" && d.category !== "PRESERVATION"
  );

  const total = hearings.length + deadlines.length;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-[#FBBF24]" />
          重要时限 <span className="text-muted-foreground">({total})</span>
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddHearing}
            className="h-7 gap-1 text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            开庭
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddDeadline}
            className="h-7 gap-1 text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            期限
          </Button>
        </div>
      </header>

      {total === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          还没有开庭或期限记录
        </p>
      ) : (
        <div className="space-y-4">
          {/* 开庭 */}
          {hearings.length > 0 && (
            <Group label="开庭" icon={<Gavel className="h-3 w-3" />}>
              {hearings.map((h) => (
                <HearingRow key={h.id} h={h} onDelete={() => handleDeleteHearing(h.id)} />
              ))}
            </Group>
          )}
          {/* 举证期限 */}
          {evidence.length > 0 && (
            <Group label="举证期限">
              {evidence.map((d) => (
                <DeadlineRow
                  key={d.id}
                  d={d}
                  onToggle={() => handleToggle(d.id)}
                  onDelete={() => handleDeleteDeadline(d.id)}
                  pending={isPending}
                />
              ))}
            </Group>
          )}
          {/* 保全期限 */}
          {preservation.length > 0 && (
            <Group label="保全期限（含续期）">
              {preservation.map((d) => (
                <DeadlineRow
                  key={d.id}
                  d={d}
                  onToggle={() => handleToggle(d.id)}
                  onDelete={() => handleDeleteDeadline(d.id)}
                  pending={isPending}
                />
              ))}
            </Group>
          )}
          {/* 其他期限 */}
          {others.length > 0 && (
            <Group label="其他期限">
              {others.map((d) => (
                <DeadlineRow
                  key={d.id}
                  d={d}
                  onToggle={() => handleToggle(d.id)}
                  onDelete={() => handleDeleteDeadline(d.id)}
                  pending={isPending}
                />
              ))}
            </Group>
          )}
        </div>
      )}
    </section>
  );
}

function Group({
  label,
  icon,
  children
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function DeadlineRow({
  d,
  onToggle,
  onDelete,
  pending
}: {
  d: Deadline;
  onToggle: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const days = daysUntil(d.dueAt);
  const isOverdue = !d.completed && days < 0;
  const isWarn = !d.completed && days <= d.remindDays && days >= 0;
  return (
    <li
      className={cn(
        "group flex items-start gap-3 rounded-md border bg-background px-3 py-2 transition-colors",
        d.completed
          ? "border-border opacity-50"
          : isOverdue
            ? "border-destructive/40"
            : isWarn
              ? "border-[#FBBF24]/40"
              : "border-border"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          d.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input hover:border-primary"
        )}
        aria-label={d.completed ? "标记未完成" : "标记完成"}
      >
        {d.completed && <Check className="h-2.5 w-2.5" />}
      </button>

      <div className="flex-1 overflow-hidden">
        <span
          className={cn(
            "truncate text-sm font-medium",
            d.completed && "line-through text-muted-foreground"
          )}
        >
          {d.title}
        </span>
        {d.basis && (
          <div className="mt-0.5 text-[11px] text-muted-foreground">{d.basis}</div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 text-right">
        <div className="font-mono text-xs tabular">
          {d.completed ? (
            "已完成"
          ) : isOverdue ? (
            <span className="text-destructive">逾期 {-days}d</span>
          ) : days === 0 ? (
            <span className="text-[#FBBF24]">今天</span>
          ) : isWarn ? (
            <span className="text-[#FBBF24]">{days}d</span>
          ) : (
            <span>{days}d</span>
          )}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground tabular">
          {new Date(d.dueAt).toLocaleDateString("zh-CN")}
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="删除"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </button>
    </li>
  );
}

function HearingRow({ h, onDelete }: { h: Hearing; onDelete: () => void }) {
  const upcoming = new Date(h.startsAt) > new Date();
  return (
    <li className="group rounded-md border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium">{h.title}</span>
          <Badge variant="outline" className="text-[9px]">
            {upcoming ? "未召开" : "已召开"}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <div>
          <span className="text-foreground/60">时间：</span>
          <span className="font-mono tabular text-foreground">
            {new Date(h.startsAt).toLocaleString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </span>
        </div>
        {h.room && (
          <div>
            <span className="text-foreground/60">法庭：</span>
            <span className="text-foreground">{h.room}</span>
          </div>
        )}
        {h.judge && (
          <div className="col-span-2">
            <span className="text-foreground/60">主审：</span>
            <span className="text-foreground">{h.judge}</span>
          </div>
        )}
        {h.notes && (
          <div className="col-span-2 mt-1 whitespace-pre-wrap text-foreground/80">
            {h.notes}
          </div>
        )}
      </div>
    </li>
  );
}

// ============ 备忘录 ============

function MemosCard({
  procedureId,
  memos
}: {
  procedureId: string;
  memos: ProcedureMemo[];
}) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");

  function handleAdd() {
    const content = draft.trim();
    if (!content) return;
    startTransition(async () => {
      try {
        await addProcedureMemo({ procedureId, content });
        setDraft("");
      } catch (err) {
        toast.error("添加失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      try {
        await toggleProcedureMemo(id);
      } catch {
        toast.error("操作失败");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteProcedureMemo(id);
      } catch {
        toast.error("删除失败");
      }
    });
  }

  const pending = memos.filter((m) => !m.done);
  const done = memos.filter((m) => m.done);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <StickyNote className="h-4 w-4 text-primary" />
          备忘录 <span className="text-muted-foreground">({memos.length})</span>
        </h3>
      </header>

      {/* 添加 */}
      <div className="mb-3 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="记一条待办，回车添加"
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={isPending || !draft.trim()}
          className="h-8 shrink-0 gap-1"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          添加
        </Button>
      </div>

      {memos.length === 0 ? (
        <p className="flex flex-col items-center gap-1.5 py-6 text-center text-xs text-muted-foreground">
          <ClipboardList className="h-5 w-5 opacity-30" />
          还没有备忘
        </p>
      ) : (
        <ul className="space-y-1.5">
          {[...pending, ...done].map((m) => (
            <li
              key={m.id}
              className={cn(
                "group flex items-start gap-2.5 rounded-md border border-border bg-background px-3 py-2",
                m.done && "opacity-50"
              )}
            >
              <button
                type="button"
                onClick={() => handleToggle(m.id)}
                disabled={isPending}
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  m.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:border-primary"
                )}
                aria-label={m.done ? "标记待办" : "标记完成"}
              >
                {m.done && <Check className="h-2.5 w-2.5" />}
              </button>
              <span
                className={cn(
                  "flex-1 whitespace-pre-wrap break-words text-sm",
                  m.done && "line-through text-muted-foreground"
                )}
              >
                {m.content}
              </span>
              <span className="shrink-0 self-center rounded-full border border-border px-1.5 text-[9px] text-muted-foreground">
                {m.done ? "已办" : "待办"}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                className="self-center opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="删除"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
