"use client";

import Link from "next/link";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { todayFocus } from "@/lib/mock-data";

export function HeroBlock() {
  const today = new Date();

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 gap-4 lg:grid-cols-5"
    >
      {/* 左侧：欢迎语 + 概况 */}
      <div className="lg:col-span-3">
        <div className="flex h-full flex-col justify-between rounded-xl border border-border bg-card/40 p-6 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="flex items-baseline gap-3 text-2xl font-semibold tracking-tight">
                早安，叶森
                <span className="text-sm font-normal text-muted-foreground">
                  {formatDate(today, "full")}
                </span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                你有 <span className="font-semibold text-foreground tabular">3</span>{" "}
                件事需要处理 · 本周开庭{" "}
                <span className="font-semibold text-foreground tabular">2</span> 场 · 期限{" "}
                <span className="font-semibold text-foreground tabular">4</span> 项
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-primary/60" />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              新建收案
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5">
              发起冲突检索
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5">
              录入开庭笔录
            </Button>
          </div>
        </div>
      </div>

      {/* 右侧：今日焦点（玻璃 + 主色光晕） */}
      <Link
        href={todayFocus.href}
        className="ll-glass-accent group relative flex flex-col justify-between overflow-hidden rounded-xl p-6 transition-transform hover:-translate-y-0.5 lg:col-span-2"
      >
        <div className="absolute right-4 top-4 text-[10px] uppercase tracking-widest text-primary/60">
          今日焦点
        </div>

        <div className="mt-4">
          <div className="text-xs text-muted-foreground">距离 {todayFocus.title}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-semibold tabular tracking-tight text-foreground">
              {todayFocus.daysLeft}
            </span>
            <span className="text-sm text-muted-foreground">天</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{todayFocus.matter}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {todayFocus.internalCode}
            </div>
          </div>
          <ArrowRight
            className={cn(
              "h-4 w-4 text-primary transition-transform",
              "group-hover:translate-x-0.5"
            )}
          />
        </div>
      </Link>
    </motion.section>
  );
}
