"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Search, Users, X } from "lucide-react";
import type { OpposingParty, PartyType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { OpposingPartySheet } from "./opposing-party-sheet";
import { OpposingPartiesTable } from "./opposing-parties-table";
import { OPPOSING_PARTY_TYPE_OPTIONS, opposingPartyTypeLabel } from "@/lib/enums";

type OpposingPartyRow = OpposingParty & {
  _count: { parties: number };
};

type Props = {
  initialData: {
    items: OpposingPartyRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  initialFilters: {
    search: string;
    partyType: PartyType | "ALL";
  };
};

export function OpposingPartiesView({ initialData, initialFilters }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(initialFilters.search);
  const [partyType, setPartyType] = useState<PartyType | "ALL">(initialFilters.partyType);
  const [page, setPage] = useState(initialData.page);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingOpposingParty, setEditingOpposingParty] = useState<OpposingPartyRow | null>(null);

  const updateUrl = useCallback(
    (next: { search?: string; partyType?: string; page?: number }) => {
      const params = new URLSearchParams();
      const s = next.search ?? search;
      const t = next.partyType ?? partyType;
      const p = next.page;
      if (s) params.set("search", s);
      if (t && t !== "ALL") params.set("partyType", t);
      if (p && p > 1) params.set("page", String(p));
      startTransition(() => {
        router.replace(`/opposing-parties${params.toString() ? `?${params.toString()}` : ""}`);
      });
    },
    [router, search, partyType]
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateUrl({ search });
  }

  function clearFilters() {
    setSearch("");
    setPartyType("ALL");
    setPage(1);
    startTransition(() => router.replace("/opposing-parties"));
  }

  function handleNew() {
    setEditingOpposingParty(null);
    setSheetOpen(true);
  }

  function handleEdit(op: OpposingPartyRow) {
    setEditingOpposingParty(op);
    setSheetOpen(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <header className="space-y-2">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-medium tracking-tight">对方当事人管理</h1>
            <p className="text-[13px] text-muted-foreground">
              共 <span className="font-mono tabular text-foreground">{initialData.total}</span> 位对方当事人
            </p>
          </div>
          <Button onClick={handleNew} className="h-9 gap-1.5 px-4 shadow-sm">
            <Plus className="h-4 w-4" strokeWidth={2} />
            新建当事人
          </Button>
        </div>
        <div className="ll-rule" />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative min-w-0 sm:min-w-64 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.8}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => updateUrl({ search })}
            placeholder="搜索名称 / 身份证号 / 电话"
            className="h-9 border-border bg-card pl-9"
          />
        </form>

        <Select
          value={partyType}
          onValueChange={(v) => {
            const next = v as PartyType | "ALL";
            setPartyType(next);
            updateUrl({ partyType: next });
          }}
        >
          <SelectTrigger className="h-9 w-36 border-border bg-card">
            <SelectValue placeholder="主体类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部类型</SelectItem>
            {OPPOSING_PARTY_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {opposingPartyTypeLabel[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || partyType !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3.5 w-3.5" />
            清除筛选
          </Button>
        )}
      </div>

      <OpposingPartiesTable items={initialData.items} onEdit={handleEdit} />

      <PaginationBar
        page={page}
        pageSize={initialData.pageSize}
        total={initialData.total}
        onPageChange={(next) => {
          setPage(next);
          updateUrl({ page: next });
        }}
      />

      <OpposingPartySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editingOpposingParty={editingOpposingParty}
      />
    </motion.div>
  );
}
