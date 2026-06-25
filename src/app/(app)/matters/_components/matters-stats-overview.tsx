"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import type {
  OverviewStats,
  CategoryItem,
  RevenueTrendItem
} from "@/server/matters/overview-stats";

type Props = {
  stats: OverviewStats;
  categoryDistribution: CategoryItem[];
  revenueTrend: RevenueTrendItem[];
};

export function MattersStatsOverview({ stats, categoryDistribution, revenueTrend }: Props) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="ll-surface"
    >
      {/* 标题栏 + 折叠按钮 */}
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <h2 className="text-[15px] font-medium tracking-tight">案件统计</h2>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          aria-label={collapsed ? "展开" : "折叠"}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* 类别分布 + KPI 卡片：同一行 */}
          <div className="border-t border-border grid grid-cols-1 gap-4 p-5 pt-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <CategoryChart data={categoryDistribution} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-3">
              <StatCard label="全部案件" value={stats.allMatters} />
              <StatCard label="办理中" value={stats.activeMatters} accent />
              <StatCard label="待归档" value={stats.pendingArchiveMatters} />
              <StatCard label="已归档" value={stats.archivedMatters} />
            </div>
          </div>

          {/* 实收趋势 */}
          <div className="border-t border-border p-5 pt-4">
            <RevenueChart data={revenueTrend} title="全程实收趋势" />
          </div>
        </>
      )}
    </motion.section>
  );
}

function StatCard({
  label,
  value,
  accent,
  muted
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className={`ll-stat text-[1.6rem] leading-none tabular ${
          accent
            ? "text-primary"
            : muted
              ? "text-muted-foreground/60"
              : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
