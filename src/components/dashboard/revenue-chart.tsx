"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { revenueTrend } from "@/lib/mock-data";

export function RevenueChart() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="flex h-full flex-col rounded-xl border border-border bg-card/40"
    >
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">近 6 个月实收趋势</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">单位：千元</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Legend2 color="#5B8DEF" label="实收" />
          <Legend2 color="#4FD1C5" label="应收" />
        </div>
      </header>

      <div className="flex-1 p-3">
        <ResponsiveContainer width="100%" height="100%" minHeight={220}>
          <AreaChart data={revenueTrend} margin={{ top: 10, right: 12, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="received-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B8DEF" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#5B8DEF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="receivable-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4FD1C5" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#4FD1C5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: 12
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area
              type="monotone"
              dataKey="receivable"
              name="应收"
              stroke="#4FD1C5"
              strokeWidth={1.5}
              fill="url(#receivable-fill)"
            />
            <Area
              type="monotone"
              dataKey="received"
              name="实收"
              stroke="#5B8DEF"
              strokeWidth={2}
              fill="url(#received-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

function Legend2({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-0.5 w-3 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
      {label}
    </span>
  );
}
