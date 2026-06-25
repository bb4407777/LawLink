"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, Trash2 } from "lucide-react";
import type { MatterStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { deleteMatter, restoreMatter, permanentDeleteMatter } from "@/server/matters/lifecycle";
import { ArchiveWizardDialog } from "./archive-wizard";

export function LifecycleActions({
  matterId,
  status,
  canArchive,
  isDeleted
}: {
  matterId: string;
  status: MatterStatus;
  canArchive: boolean;
  isDeleted?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [archiveOpen, setArchiveOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteMatter(matterId);
        toast.success("案件已删除");
        router.push("/matters");
      } catch (err) {
        toast.error("删除失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function handleRestore() {
    startTransition(async () => {
      try {
        await restoreMatter(matterId);
        toast.success("案件已恢复");
        router.refresh();
      } catch (err) {
        toast.error("恢复失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function handlePermanentDelete() {
    if (!confirm("确定彻底删除？此操作不可撤销！")) return;
    startTransition(async () => {
      try {
        await permanentDeleteMatter(matterId);
        toast.success("案件已彻底删除");
        router.push("/matters");
      } catch (err) {
        toast.error("删除失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  const deleteBtn = (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-700"
      title="软删除案件"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );

  if (isDeleted) {
    return (
      <div className="inline-flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleRestore}>
          恢复
        </Button>
        <Button variant="outline" size="sm" className="text-red-600" onClick={handlePermanentDelete}>
          彻底删除
        </Button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      {canArchive && !isDeleted && !(status === "ARCHIVED") && (
        <Button
          size="sm"
          onClick={() => setArchiveOpen(true)}
          className="gap-1.5"
        >
          <Archive className="h-3.5 w-3.5" />
          归档
        </Button>
      )}
      {deleteBtn}

      <ArchiveWizardDialog
        matterId={matterId}
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
      />
    </div>
  );
}
