"use client";

import { Button } from "@/components/ui/button";

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-2.5">
      <span className="text-[12px] text-muted-foreground">
        共 <span className="font-mono tabular-nums text-foreground">{total}</span> 件，第{" "}
        <span className="font-mono tabular-nums text-foreground">{page}</span>/
        <span className="font-mono tabular-nums text-foreground">{totalPages}</span> 页
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 bg-background px-2 text-[12px]"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 bg-background px-2 text-[12px]"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
