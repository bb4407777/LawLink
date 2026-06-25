"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { createTask } from "@/server/tasks/actions";
import type { Matter } from "@prisma/client";

export function TaskCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [matterSearch, setMatterSearch] = useState("");
  const [matters, setMatters] = useState<Pick<Matter, "id" | "title" | "internalCode">[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<Pick<Matter, "id" | "title"> | null>(null);
  const [dueAt, setDueAt] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle("");
      setMatterSearch("");
      setSelectedMatter(null);
      setDueAt("");
      setMatters([]);
    }
  }, [open]);

  useEffect(() => {
    if (!matterSearch.trim()) { setMatters([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-matters?q=${encodeURIComponent(matterSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setMatters(data.slice(0, 10));
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [matterSearch]);

  function handleSubmit() {
    if (!title.trim()) { toast.warning("请填写事项标题"); return; }

    startTransition(async () => {
      try {
        await createTask({
          matterId: selectedMatter?.id,
          title: title.trim(),
          description: "",
          dueAt: dueAt ? new Date(dueAt) : undefined,
          priority: 0
        });
        toast.success("待办已创建");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error("创建失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-9 gap-1.5 px-4 shadow-sm">
        <Plus className="h-4 w-4" />新建待办
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建待办事项</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">事项标题 <span className="text-destructive">*</span></Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="输入待办事项" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">关联案件 <span className="text-muted-foreground/60">（可选）</span></Label>
              {selectedMatter ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <span className="flex-1 truncate">{selectedMatter.title}</span>
                  <button onClick={() => setSelectedMatter(null)} className="text-xs text-muted-foreground hover:text-foreground">更换</button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Input
                    value={matterSearch}
                    onChange={e => setMatterSearch(e.target.value)}
                    placeholder="搜索案件名称..."
                    className="font-mono"
                  />
                  {matters.length > 0 && (
                    <ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-background">
                      {matters.map(m => (
                        <li key={m.id}>
                          <button type="button" onClick={() => setSelectedMatter(m)} className="w-full px-3 py-2 text-left text-xs hover:bg-muted/40">
                            <div className="font-medium">{m.title}</div>
                            {m.internalCode && <div className="font-mono text-[10px] text-muted-foreground">{m.internalCode}</div>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">截止日期</Label>
              <Input type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>取消</Button>
            <Button onClick={handleSubmit} disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
