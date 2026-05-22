"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Archive,
  Pause,
  Play,
  Loader2,
  MoreHorizontal,
  Lock
} from "lucide-react";
import type { MatterStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  closeMatter,
  archiveMatter,
  reopenMatter,
  holdMatter
} from "@/server/matters/lifecycle";

export function LifecycleActions({
  matterId,
  status,
  userRole
}: {
  matterId: string;
  status: MatterStatus;
  userRole: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"close" | "archive" | "hold" | null>(null);
  const [text, setText] = useState("");

  const canArchive = userRole === "ADMIN" || userRole === "PRINCIPAL_LAWYER";
  const isArchived = status === "ARCHIVED";

  function open(d: "close" | "archive" | "hold") {
    setText("");
    setDialog(d);
  }

  function handleSubmit() {
    if (dialog === "close" && !text.trim()) {
      toast.warning("请填写结案小结");
      return;
    }
    startTransition(async () => {
      try {
        if (dialog === "close") {
          await closeMatter({ id: matterId, summary: text });
          toast.success("案件已结案");
        } else if (dialog === "archive") {
          await archiveMatter({ id: matterId, summary: text });
          toast.success("案件已归档，转为只读");
        } else if (dialog === "hold") {
          await holdMatter({ id: matterId, reason: text });
          toast.success("案件已暂停");
        }
        setDialog(null);
        router.refresh();
      } catch (err) {
        toast.error("操作失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function handleReopen() {
    if (!confirm("将案件重新开放为'办理中'？")) return;
    startTransition(async () => {
      try {
        await reopenMatter(matterId);
        toast.success("案件已重新开放");
        router.refresh();
      } catch (err) {
        toast.error("操作失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  if (isArchived) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-[#9B7BF7]/30 bg-[#9B7BF7]/10 px-3 py-1.5 text-xs text-[#9B7BF7]">
        <Lock className="h-3.5 w-3.5" />
        已归档（只读）
      </span>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending} className="gap-1.5">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
            状态
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {(status === "ON_HOLD" || status === "CLOSED") && (
            <DropdownMenuItem onSelect={handleReopen}>
              <Play className="mr-2 h-4 w-4" />
              重新开放
            </DropdownMenuItem>
          )}
          {status === "IN_PROGRESS" && (
            <DropdownMenuItem onSelect={() => open("hold")}>
              <Pause className="mr-2 h-4 w-4" />
              暂停办理
            </DropdownMenuItem>
          )}
          {status !== "CLOSED" && (
            <DropdownMenuItem onSelect={() => open("close")}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-[#4ADE80]" />
              结案
            </DropdownMenuItem>
          )}
          {canArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => open("archive")}
                className="text-[#9B7BF7] focus:text-[#9B7BF7]"
              >
                <Archive className="mr-2 h-4 w-4" />
                归档（不可逆）
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "close" ? "结案" : dialog === "archive" ? "归档案件" : "暂停案件"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "close" &&
                "结案后案件状态为'已结案'，仍可编辑。结案小结会进入时间线。"}
              {dialog === "archive" &&
                "归档后案件转为只读，所有 tab 禁止编辑。仅 ADMIN/主办律师可执行。"}
              {dialog === "hold" && "暂停后案件不再显示在'办理中'筛选。"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label className="text-xs">
              {dialog === "close" ? "结案小结" : dialog === "archive" ? "归档备注" : "暂停原因"}
              {dialog === "close" && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                dialog === "close"
                  ? "如：经一审判决支持原告诉请，对方未上诉，判决已生效"
                  : dialog === "archive"
                    ? "可选 — 补充归档说明"
                    : "如：等待客户补充证据材料"
              }
              rows={5}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)} disabled={isPending}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className={
                dialog === "archive"
                  ? "bg-[#9B7BF7] text-white hover:bg-[#9B7BF7]/90"
                  : ""
              }
            >
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {dialog === "close" ? "确认结案" : dialog === "archive" ? "确认归档" : "确认暂停"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
