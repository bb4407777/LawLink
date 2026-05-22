"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { categoryDistribution } from "@/lib/mock-data";

export function CategoryChart() {
  const total = categoryDistribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="flex h-full flex-col rounded-xl border border-border bg-card/40"
    >
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">案件类型分布</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">全部办理中案件</p>
      </header>

      <div className="grid flex-1 grid-cols-5 items-center gap-3 p-5">
        <div className="relative col-span-2 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryDistribution}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={2}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {categoryDistribution.map((entry) => (
                  <Cell key={entry.code} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-semibold tabular text-foreground">
              {total}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              total
            </span>
          </div>
        </div>

        <ul className="col-span-3 space-y-1.5">
          {categoryDistribution.map((cat) => {
            const pct = Math.round((cat.value / total) * 100);
            return (
              <li
                key={cat.code}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-popover/50"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color, boxShadow: `0 0 8px ${cat.color}` }}
                />
                <span className="flex-1 truncate text-xs">{cat.name}</span>
                <span className="font-mono text-xs tabular text-muted-foreground">
                  {cat.value}
                </span>
                <span className="font-mono text-xs tabular text-muted-foreground">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.section>
  );
}
