"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Search, FileText, X, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { IntakeStatus, ConflictSeverity } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { matterCategoryLabel, matterCategoryColor, intakeStatusLabel } from "@/lib/enums";
import { IntakeSheet } from "./intake-sheet";
import type { ClientOption } from "@/app/(app)/matters/_components/matters-view";

type IntakeRow = {
  id: string;
  title: string;
  category: keyof typeof matterCategoryLabel;
  status: IntakeStatus;
  receivedAt: Date;
  client: { id: string; name: string } | null;
  cause: { id: string; name: string } | null;
  conflictChecks: { id: string; conclusion: string; hits: { severity: ConflictSeverity }[] }[];
  parties: { name: string }[];
  matter: { id: string; internalCode: string } | null;
};

const STATUSES: (IntakeStatus | "ALL")[] = [
  "ALL",
  "INTAKE",
  "PENDING_CONFIRMATION",
  "CONVERTED",
  "DECLINED"
];

function getHighestSeverity(severities: ConflictSeverity[]): ConflictSeverity | null {
  const order = ["LOW", "MEDIUM", "HIGH", "BLOCKING"] as const;
  let max: ConflictSeverity | null = null;
  for (const s of severities) {
    if (!max || order.indexOf(s) > order.indexOf(max)) max = s;
  }
  return max;
}

export function IntakesView({
  initialData,
  clientOptions,
  initialFilters
}: {
  initialData: { items: IntakeRow[]; total: number };
  clientOptions: ClientOption[];
  initialFilters: { search: string; status: IntakeStatus | "ALL" };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(initialFilters.search);
  const [status, setStatus] = useState<IntakeStatus | "ALL">(initialFilters.status);
  const [sheetOpen, setSheetOpen] = useState(false);

  const updateUrl = useCallback(
    (next: { search?: string; status?: string }) => {
      const params = new URLSearchParams();
      const s = next.search ?? search;
      const st = next.status ?? status;
      if (s) params.set("search", s);
      if (st && st !== "ALL") params.set("status", st);
      startTransition(() => {
        router.replace(`/intakes${params.toString() ? `?${params.toString()}` : ""}`);
      });
    },
    [router, search, status]
  );

  function clearFilters() {
    setSearch("");
    setStatus("ALL");
    startTransition(() => router.replace("/intakes"));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FileText className="h-5 w-5 text-primary" />
            收案登记
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            咨询 → 冲突检索 → 接案或不接案 · 共 {initialData.total} 条
          </p>
        </div>
        <Button
          onClick={() => setSheetOpen(true)}
          className="gap-1.5 shadow-[0_0_24px_-6px_rgba(91,141,239,0.45)]"
        >
          <Plus className="h-4 w-4" />
          新建收案
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateUrl({ search });
          }}
          className="relative flex-1 min-w-64"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => updateUrl({ search })}
            placeholder="搜索标题 / 客户 / 描述"
            className="h-9 pl-9 bg-background/60"
          />
        </form>

        <Select
          value={status}
          onValueChange={(v) => {
            const next = v as IntakeStatus | "ALL";
            setStatus(next);
            updateUrl({ status: next });
          }}
        >
          <SelectTrigger className="h-9 w-36 bg-background/60">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "全部" : intakeStatusLabel[s as IntakeStatus]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || status !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3.5 w-3.5" />
            清除筛选
          </Button>
        )}
      </div>

      <IntakesTable items={initialData.items} />

      <IntakeSheet open={sheetOpen} onOpenChange={setSheetOpen} clientOptions={clientOptions} />
    </motion.div>
  );
}

function IntakesTable({ items }: { items: IntakeRow[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/20 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          还没有收案。点击右上角 <span className="text-foreground">新建收案</span> 开始
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-popover/30">
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3 font-medium">标题</th>
            <th className="px-5 py-3 font-medium">类别</th>
            <th className="px-5 py-3 font-medium">委托方</th>
            <th className="px-5 py-3 font-medium">相对方</th>
            <th className="px-5 py-3 font-medium">冲突</th>
            <th className="px-5 py-3 font-medium">状态</th>
            <th className="px-5 py-3 font-medium">咨询日</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((it) => {
            const sev = it.conflictChecks[0]
              ? getHighestSeverity(it.conflictChecks[0].hits.map((h) => h.severity))
              : null;
            return (
              <tr key={it.id} className="transition-colors hover:bg-popover/40">
                <td className="px-5 py-3">
                  <Link
                    href={`/intakes/${it.id}`}
                    className="block font-medium hover:text-primary"
                  >
                    {it.title}
                  </Link>
                  {it.cause && (
                    <div className="text-xs text-muted-foreground">{it.cause.name}</div>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs"
                    style={{
                      borderColor: `${matterCategoryColor[it.category]}40`,
                      color: matterCategoryColor[it.category]
                    }}
                  >
                    {matterCategoryLabel[it.category]}
                  </span>
                </td>
                <td className="px-5 py-3 text-foreground">
                  {it.client ? it.client.name : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {it.parties.length > 0 ? (
                    <span className="line-clamp-1">{it.parties.map((p) => p.name).join("、")}</span>
                  ) : (
                    <span className="text-xs">—</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <SeverityBadge severity={sev} />
                </td>
                <td className="px-5 py-3">
                  {it.matter ? (
                    <Link
                      href={`/matters/${it.matter.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {it.matter.internalCode}
                    </Link>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      {intakeStatusLabel[it.status]}
                    </Badge>
                  )}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground tabular">
                  {new Date(it.receivedAt).toLocaleDateString("zh-CN")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: ConflictSeverity | null }) {
  if (!severity)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        未检索
      </span>
    );

  if (severity === "BLOCKING")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <AlertTriangle className="h-3 w-3" />
        阻塞
      </span>
    );
  if (severity === "HIGH")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#FB923C]">
        <AlertTriangle className="h-3 w-3" />
        高
      </span>
    );
  if (severity === "MEDIUM")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#FBBF24]">
        <AlertTriangle className="h-3 w-3" />
        中
      </span>
    );
  if (severity === "LOW")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#4ADE80]">
        <CheckCircle2 className="h-3 w-3" />
        低
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <XCircle className="h-3 w-3" />无
    </span>
  );
}
