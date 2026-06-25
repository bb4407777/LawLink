"use client";

import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  task: { id: string; title: string; description: string; dueAt: Date | null; matterId: string | null; matterCode: string; matterTitle: string };
};

export function TaskDetailDialog({ task }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-md p-2 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
        title="查看详情"
      >
        <Eye className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{task.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {task.matterCode && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">关联案件</span>
                <p className="text-sm rounded-md border bg-muted/30 px-3 py-2">{task.matterCode} {task.matterTitle}</p>
              </div>
            )}
            {task.description && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">详细内容</span>
                <div className="text-sm rounded-md border bg-muted/30 px-3 py-2 whitespace-pre-wrap leading-relaxed">{task.description}</div>
              </div>
            )}
            {!task.description && (
              <p className="text-sm text-muted-foreground/60">暂无详细内容</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
