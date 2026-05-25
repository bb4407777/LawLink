"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { createTask } from "@/server/tasks/actions";

type MatterPickerItem = { id: string; internalCode: string; title: string };

export function AddTaskDialog({
  open,
  onOpenChange,
  date,
  matters
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: Date | null;
  matters: MatterPickerItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [matterId, setMatterId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (!open) return;
    setMatterId("");
    setTitle("");
    setDescription("");
    setPriority(0);
  }, [open]);

  function submit() {
    if (!matterId) {
      toast.warning("请选择关联案件");
      return;
    }
    if (!title.trim()) {
      toast.warning("请填写任务标题");
      return;
    }
    if (!date) {
      toast.warning("缺少日期");
      return;
    }

    startTransition(async () => {
      try {
        await createTask({
          matterId,
          title: title.trim(),
          description,
          dueAt: date,
          priority,
          assigneeId: "",
          stageId: ""
        });
        toast.success("任务已添加");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("添加失败", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            添加任务
          </DialogTitle>
          <DialogDescription className="text-xs">
            {date
              ? date.toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long"
                })
              : "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              关联案件 <span className="text-destructive">*</span>
            </Label>
            <Select value={matterId} onValueChange={setMatterId}>
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {matters.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="font-mono text-[10.5px] text-muted-foreground">
                      {m.internalCode}
                    </span>
                    <span className="ml-2">{m.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              任务标题 <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="如：起草起诉状 / 提交证据清单"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">描述（可选）</Label>
            <Textarea
              rows={2}
              placeholder="任务详情、相关材料等"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">优先级</Label>
            <div className="flex gap-2">
              {[
                { value: 0, label: "普通" },
                { value: 1, label: "高" },
                { value: 2, label: "紧急" }
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value as 0 | 1 | 2)}
                  className={
                    priority === p.value
                      ? "rounded-md border border-primary bg-primary/15 px-3 py-1 text-xs text-primary"
                      : "rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-input"
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            取消
          </Button>
          <Button onClick={submit} disabled={isPending} className="gap-1.5">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
