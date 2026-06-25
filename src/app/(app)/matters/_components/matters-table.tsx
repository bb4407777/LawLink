"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Matter, PartyRole, LitigationStanding } from "@prisma/client";
import {
  matterCategoryLabel,
  matterCategoryColor,
  matterCategoryShort,
  matterStatusLabel
} from "@/lib/enums";
import { formatCurrency, cn } from "@/lib/utils";
import { restoreMatter, permanentDeleteMatter } from "@/server/matters/lifecycle";
import { Button } from "@/components/ui/button";

export type MatterRow = Matter & {
  primaryClient: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
  cause: { id: string; name: string } | null;
  procedures: { id: string; type: string; caseNumber: string | null; status: string }[];
  parties: { id: string; name: string; role: PartyRole; standing: LitigationStanding | null }[];
  archiveRecords?: { id: string }[];
  _count: { procedures: number };
  claimAmount: number | null;
  contractAmount: number;
  receivedAmount: number;
  intakeDate: Date | null;
  latestHearingAt: Date | null;
};

type MetaColumn = "hearing";

const MATTER_ROW_GRID =
  "grid gap-x-4 gap-y-2 lg:grid-cols-[6.5rem_5rem_minmax(12rem,1fr)_6rem_7rem_7rem_8rem_minmax(9rem,auto)] lg:items-center";

export function CaseListHeader({
  metaColumn = "hearing"
}: {
  metaColumn?: MetaColumn;
}) {
  return (
    <div
      className={cn(
        MATTER_ROW_GRID,
        "hidden border-b border-border bg-muted/30 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground lg:grid"
      )}
    >
      <div>收案时间</div>
      <div>编号</div>
      <div>案件名称</div>
      <div>标的</div>
      <div>合同额</div>
      <div>已收</div>
      <div>开庭时间</div>
      <div>状态</div>
    </div>
  );
}

export function MattersTable({
  items,
  metaColumn = "hearing"
}: {
  items: MatterRow[];
  metaColumn?: MetaColumn;
}) {
  const router = useRouter();
  const [, startRestore] = useTransition();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  function handleRestore(id: string) {
    setRestoringId(id);
    startRestore(async () => {
      try {
        await restoreMatter(id);
        toast.success("案件已恢复");
        router.refresh();
      } catch (err) {
        toast.error("恢复失败", { description: err instanceof Error ? err.message : "" });
      } finally {
        setRestoringId(null);
      }
    });
  }

  function handlePermanentDelete(id: string) {
    if (!confirm("确定彻底删除？此操作不可撤销！案件所有数据将从数据库永久移除。")) return;
    setRestoringId(id);
    startRestore(async () => {
      try {
        await permanentDeleteMatter(id);
        toast.success("案件已彻底删除");
        router.refresh();
      } catch (err) {
        toast.error("删除失败", { description: err instanceof Error ? err.message : "" });
      } finally {
        setRestoringId(null);
      }
    });
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-card py-20 text-center">
        <div className="text-base text-muted-foreground">没有匹配的案件</div>
        <div className="text-xs text-muted-foreground/70">
          点击右上角 <span className="text-foreground/80">新建收案</span> 开始
        </div>
      </div>
    );
  }

  return (
    <div className="ll-surface rounded-lg">
      <CaseListHeader metaColumn={metaColumn} />
      <ul>
        {items.map((m) => (
          <CaseListCard
            key={m.id}
            href={`/matters/${m.id}`}
            title={m.title}
            accent={matterCategoryColor[m.category]}
            status={{
              label:
                (m.archiveRecords?.length ?? 0) > 0
                  ? "归档中"
                  : matterStatusLabel[m.status],
              dot:
                (m.archiveRecords?.length ?? 0) > 0
                  ? MATTER_STATUS_DOT.ARCHIVED
                  : MATTER_STATUS_DOT[m.status]
            }}
            categoryShort={matterCategoryShort[m.category]}
            internalCode={m.internalCode}
            intakeDate={m.intakeDate}
            latestHearingAt={m.latestHearingAt}
            claimAmount={m.claimAmount ? Number(m.claimAmount) : null}
            contractAmount={m.contractAmount}
            receivedAmount={m.receivedAmount}
            metaColumn={metaColumn}
            inTable
            deletedAt={m.deletedAt}
            restoring={restoringId === m.id}
            onRestore={m.deletedAt ? () => handleRestore(m.id) : undefined}
            onPermanentDelete={m.deletedAt ? () => handlePermanentDelete(m.id) : undefined}
          />
        ))}
      </ul>
    </div>
  );
}

const MATTER_STATUS_DOT: Record<MatterRow["status"], string> = {
  PENDING_ACCEPTANCE: "#f59e0b",
  IN_PROGRESS: "#10b981",
  FILING_MATERIALS: "#f97316",
  FILING_MATERIALS_SIGN: "#fb923c",
  ONLINE_FILING: "#eab308",
  ONLINE_FILING_REVIEW: "#facc15",
  FILING_ACCEPTED: "#84cc16",
  FEE_PAYMENT_PENDING: "#f43f5e",
  FEE_PAID: "#fb7185",
  HEARING_SCHEDULED: "#0ea5e9",
  POST_HEARING: "#6366f1",
  POST_JUDGMENT: "#8b5cf6",
  EXECUTION_MATERIALS: "#06b6d4",
  EXECUTION_MATERIALS_SIGN: "#22d3ee",
  EXECUTION_ONLINE_FILING: "#14b8a6",
  EXECUTION_ONLINE_REVIEW: "#2dd4bf",
  EXECUTION_PRESERVATION: "#ef4444",
  EXECUTION: "#f87171",
  INVESTIGATION: "#ea580c",
  DETENTION_30: "#f97316",
  ARREST_REVIEW_7: "#fb923c",
  POST_ARREST_REVIEW: "#f59e0b",
  CUSTODY_NECESSITY: "#eab308",
  BAIL_PENDING: "#84cc16",
  PROSECUTION_REVIEW: "#d97706",
  TRIAL: "#dc2626",
  CRIMINAL_EXECUTION: "#e11d48",
  ON_HOLD: "#94a3b8",
  CLOSED: "#3b82f6",
  PENDING_ARCHIVE: "#94a3b8",
  ARCHIVED: "#8b5cf6"
};

// 通用卡片：供 MattersTable + IntakesTable 共用
export function CaseListCard({
  href,
  title,
  accent,
  status,
  categoryShort,
  internalCode = "",
  intakeDate,
  latestHearingAt = null,
  claimAmount,
  contractAmount = 0,
  receivedAmount = 0,
  metaColumn = "hearing",
  inTable = false,
  deletedAt,
  restoring,
  onRestore,
  onPermanentDelete
}: {
  href: string;
  title: string;
  accent: string;
  status: { label: string; dot: string };
  categoryShort: string;
  internalCode?: string;
  intakeDate: Date | null;
  latestHearingAt?: Date | null;
  claimAmount: number | null;
  contractAmount?: number;
  receivedAmount?: number;
  metaColumn?: MetaColumn;
  inTable?: boolean;
  deletedAt?: Date | null;
  restoring?: boolean;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
}) {
  return (
    <li className={cn(inTable ? "border-t border-border first:border-t-0" : "rounded-lg border border-border bg-card")}>
      <Link
        href={href}
        className={cn(
          "group block transition-colors",
          inTable ? "px-3 py-2.5 hover:bg-muted/30" : "rounded-lg px-4 py-3 hover:bg-muted/40"
        )}
      >
        <div className={MATTER_ROW_GRID}>
          <DataCell label="收案时间">
            <span className="font-mono tabular-nums text-foreground/70">
              {formatDate(intakeDate)}
            </span>
          </DataCell>

          <DataCell label="编号">
            <span className="font-mono tabular-nums text-[11px] text-foreground/70">
              {internalCode || "—"}
            </span>
          </DataCell>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm border px-1 text-[10.5px] font-medium leading-none"
                style={{
                  background: `${accent}14`,
                  borderColor: `${accent}66`,
                  color: accent
                }}
              >
                {categoryShort}
              </span>
              <span className="min-w-0 truncate text-[12px] font-normal leading-5 text-primary">
                {title || "（未命名）"}
              </span>
            </div>
          </div>

          <DataCell label="标的">
            <span className="font-mono tabular-nums text-foreground/75">
              {claimAmount != null ? formatCurrency(claimAmount) : "—"}
            </span>
          </DataCell>

          <DataCell label="合同额">
            <span className="font-mono tabular-nums text-foreground/75">
              {formatCurrency(contractAmount)}
            </span>
          </DataCell>

          <DataCell label="已收">
            <span className="font-mono tabular-nums text-foreground/75">
              {formatCurrency(receivedAmount)}
            </span>
          </DataCell>

          <DataCell label="开庭时间">
            <span
              className={cn(
                "font-mono tabular-nums",
                latestHearingAt ? "text-primary" : "text-muted-foreground/55"
              )}
            >
              {formatDateTime(latestHearingAt)}
            </span>
          </DataCell>

          <DataCell label="状态">
            <div className="flex items-center gap-1.5">
              <StatusChip label={status.label} dot={status.dot} />
              {onRestore && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRestore();
                    }}
                    disabled={restoring}
                    className="inline-flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-0.5 text-[10.5px] text-green-700 hover:bg-green-100"
                  >
                    {restoring && <Loader2 className="h-3 w-3 animate-spin" />}
                    恢复
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPermanentDelete?.();
                    }}
                    disabled={restoring}
                    className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-[10.5px] text-red-600 hover:bg-red-100"
                  >
                    彻底删除
                  </button>
                </>
              )}
            </div>
          </DataCell>
        </div>
      </Link>
    </li>
  );
}

function DataCell({
  label,
  className,
  children
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1 text-[12px] text-muted-foreground lg:block", className)}>
      <span className="shrink-0 text-[11px] text-muted-foreground/60 lg:hidden">
        {label}：
      </span>
      {children}
    </div>
  );
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatDateTime(value: Date | null) {
  if (!value) return "暂无开庭";
  const date = new Date(value);
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function StatusChip({ label, dot }: { label: string; dot: string }) {
  return (
    <span
      className="inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[10.5px]"
      style={{
        background: `${dot}12`,
        borderColor: `${dot}55`,
        color: dot
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}
