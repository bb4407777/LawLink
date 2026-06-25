"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Search, X } from "lucide-react";
import type { PotentialClient } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Input } from "@/components/ui/input";
import { PotentialClientSheet } from "./potential-client-sheet";
import { PotentialClientsTable } from "./potential-clients-table";

type Props = {
  initialData: { items: PotentialClient[]; total: number; page: number; pageSize: number };
  initialFilters: { search: string };
};

export function PotentialClientsView({ initialData, initialFilters }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(initialFilters.search);
  const [page, setPage] = useState(initialData.page);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<PotentialClient | null>(null);

  const updateUrl = useCallback(
    (next: { search?: string; page?: number }) => {
      const params = new URLSearchParams();
      const s = next.search ?? search;
      const p = next.page;
      if (s) params.set("search", s);
      if (p && p > 1) params.set("page", String(p));
      startTransition(() => router.replace(`/potential-clients${params.toString() ? `?${params.toString()}` : ""}`));
    },
    [router, search]
  );

  function handleSearchSubmit(e: React.FormEvent) { e.preventDefault(); updateUrl({ search }); }
  function clearFilters() { setSearch(""); setPage(1); startTransition(() => router.replace("/potential-clients")); }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-medium tracking-tight">潜在客户管理</h1>
            <p className="text-[13px] text-muted-foreground">共 <span className="font-mono tabular text-foreground">{initialData.total}</span> 位</p>
          </div>
          <Button onClick={() => setSheetOpen(true)} className="h-9 gap-1.5 px-4 shadow-sm">
            <Plus className="h-4 w-4" />新建潜在客户
          </Button>
        </div>
        <div className="ll-rule" />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative min-w-0 sm:min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索名称 / 电话" className="h-9 border-border bg-card pl-9" />
        </form>
        {search && <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1"><X className="h-3.5 w-3.5" />清除</Button>}
      </div>

      <PotentialClientsTable items={initialData.items} onEdit={setEditingClient} />

      <PaginationBar page={page} pageSize={initialData.pageSize} total={initialData.total}
        onPageChange={(next) => { setPage(next); updateUrl({ page: next }); }}
      />

      <PotentialClientSheet open={sheetOpen} onOpenChange={setSheetOpen} editingClient={editingClient} />
    </motion.div>
  );
}
