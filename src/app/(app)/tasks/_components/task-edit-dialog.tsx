"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { updateTask } from "@/server/tasks/actions";

type Props = {
  task: { id: string; title: string; description: string; dueAt: Date | null; matterId: string | null; matterTitle: string };
};

export function TaskEditDialog({ task }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [dueAt, setDueAt] = useState(task.dueAt ? task.dueAt.toISOString().slice(0, 10) : "");

  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description);
      setDueAt(task.dueAt ? task.dueAt.toISOString().slice(0, 10) : "");
    }
  }, [open, task]);

  function handleSubmit() {
    if (!title.trim()) { toast.warning("标题不能为空"); return; }
    startTransition(async () => {
      try {
        await updateTask({
          id: task.id,
          matterId: task.matterId ?? undefined,
          title: title.trim(),
          description: description.trim(),
          dueAt: dueAt ? new Date(dueAt) : undefined,
          priority: 0
        });
        toast.success("已更新");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error("更新失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="shrink-0 rounded-md p-2 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground">
        <Pencil className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>编辑待办</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">事项标题</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">关联案件</Label>
              <div className="text-xs text-muted-foreground rounded-md border bg-muted/30 px-3 py-2">{task.matterTitle}</div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">截止日期</Label>
              <Input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">备注</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="补充信息、背景说明……" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>取消</Button>
            <Button onClick={handleSubmit} disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
