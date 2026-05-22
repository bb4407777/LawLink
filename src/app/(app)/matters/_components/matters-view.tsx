"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Search, FolderOpen, X } from "lucide-react";
import type { MatterCategory, MatterStatus, ClientType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { matterCategoryLabel, matterStatusLabel } from "@/lib/enums";
import { MatterSheet } from "./matter-sheet";
import { MattersTable, type MatterRow } from "./matters-table";

export type ClientOption = { id: string; name: string; type: ClientType };

type Props = {
  initialData: { items: MatterRow[]; total: number };
  clientOptions: ClientOption[];
  initialFilters: {
    search: string;
    category: MatterCategory | "ALL";
    status: MatterStatus | "ALL";
  };
};

const ALL_CATEGORIES: (MatterCategory | "ALL")[] = [
  "ALL",
  "CIVIL_COMMERCIAL",
  "CRIMINAL",
  "ADMINISTRATIVE",
  "NON_LITIGATION",
  "LEGAL_COUNSEL",
  "SPECIAL_PROJECT"
];

const ALL_STATUSES: (MatterStatus | "ALL")[] = [
  "ALL",
  "IN_PROGRESS",
  "PENDING_ACCEPTANCE",
  "ON_HOLD",
  "CLOSED",
  "ARCHIVED"
];

export function MattersView({ initialData, clientOptions, initialFilters }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(initialFilters.search);
  const [category, setCategory] = useState<MatterCategory | "ALL">(initialFilters.category);
  const [status, setStatus] = useState<MatterStatus | "ALL">(initialFilters.status);
  const [sheetOpen, setSheetOpen] = useState(false);

  const updateUrl = useCallback(
    (next: { search?: string; category?: string; status?: string }) => {
      const params = new URLSearchParams();
      const s = next.search ?? search;
      const c = next.category ?? category;
      const st = next.status ?? status;
      if (s) params.set("search", s);
      if (c && c !== "ALL") params.set("category", c);
      if (st && st !== "ALL") params.set("status", st);
      startTransition(() => {
        router.replace(`/matters${params.toString() ? `?${params.toString()}` : ""}`);
      });
    },
    [router, search, category, status]
  );

  function clearFilters() {
    setSearch("");
    setCategory("ALL");
    setStatus("ALL");
    startTransition(() => router.replace("/matters"));
  }

  const hasFilters = search || category !== "ALL" || status !== "ALL";

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
            <FolderOpen className="h-5 w-5 text-primary" />
            案件管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {initialData.total} 件案件
          </p>
        </div>
        <Button
          onClick={() => setSheetOpen(true)}
          className="gap-1.5 shadow-[0_0_24px_-6px_rgba(91,141,239,0.45)]"
        >
          <Plus className="h-4 w-4" />
          新建案件
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
            placeholder="搜索案件名称 / 编号 / 客户"
            className="h-9 pl-9 bg-background/60"
          />
        </form>

        <Select
          value={category}
          onValueChange={(v) => {
            const next = v as MatterCategory | "ALL";
            setCategory(next);
            updateUrl({ category: next });
          }}
        >
          <SelectTrigger className="h-9 w-36 bg-background/60">
            <SelectValue placeholder="案件类别" />
          </SelectTrigger>
          <SelectContent>
            {ALL_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c === "ALL" ? "全部类别" : matterCategoryLabel[c as MatterCategory]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => {
            const next = v as MatterStatus | "ALL";
            setStatus(next);
            updateUrl({ status: next });
          }}
        >
          <SelectTrigger className="h-9 w-32 bg-background/60">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "全部状态" : matterStatusLabel[s as MatterStatus]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3.5 w-3.5" />
            清除筛选
          </Button>
        )}
      </div>

      <MattersTable items={initialData.items} />

      <MatterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        clientOptions={clientOptions}
      />
    </motion.div>
  );
}
