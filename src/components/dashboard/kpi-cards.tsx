"use client";

import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { dashboardKpis } from "@/lib/mock-data";

export function KpiCards() {
  return (
    <motion.section
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {dashboardKpis.map((kpi) => (
        <motion.div
          key={kpi.key}
          variants={{
            hidden: { opacity: 0, y: 8 },
            show: { opacity: 1, y: 0 }
          }}
          className="group relative overflow-hidden rounded-xl border border-border bg-card/40 p-5 transition-colors hover:border-input"
        >
          <div className="text-xs font-medium text-muted-foreground">{kpi.label}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tabular tracking-tight">
              {kpi.valueFormat === "currency"
                ? formatCurrency(kpi.value, { compact: true })
                : kpi.value}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1 text-xs">
            <TrendIcon direction={kpi.trend.direction} />
            <span
              className={cn(
                "tabular",
                kpi.trend.direction === "up" && "text-[#4ADE80]",
                kpi.trend.direction === "warn" && "text-[#FBBF24]",
                kpi.trend.direction === "down" && "text-[#F87171]"
              )}
            >
              {kpi.trend.text}
            </span>
          </div>

          {/* 迷你 sparkline */}
          <div className="mt-4 h-8">
            <Sparkline values={kpi.sparkline} />
          </div>
        </motion.div>
      ))}
    </motion.section>
  );
}

function TrendIcon({ direction }: { direction: "up" | "down" | "warn" }) {
  if (direction === "up") return <ArrowUp className="h-3.5 w-3.5 text-[#4ADE80]" />;
  if (direction === "down") return <ArrowDown className="h-3.5 w-3.5 text-[#F87171]" />;
  return <AlertTriangle className="h-3.5 w-3.5 text-[#FBBF24]" />;
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 100;
  const h = 32;
  const stepX = w / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id="sparkline-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5B8DEF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#5B8DEF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkline-fill)" />
      <polyline
        points={points}
        fill="none"
        stroke="#5B8DEF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
