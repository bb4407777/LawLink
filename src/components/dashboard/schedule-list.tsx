"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Calendar, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { scheduleItems, type ScheduleItem } from "@/lib/mock-data";

const typeMeta = {
  deadline: { icon: AlertTriangle, color: "text-[#FBBF24]", label: "期限" },
  hearing: { icon: Calendar, color: "text-primary", label: "开庭" },
  task: { icon: Clock, color: "text-[#4FD1C5]", label: "任务" }
};

export function ScheduleList() {
  // 按日期分组
  const grouped = scheduleItems.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const key = `${item.date} · ${item.weekday}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="flex h-full flex-col rounded-xl border border-border bg-card/40"
    >
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">近期日程</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            未来 7 天的开庭、期限、关键任务
          </p>
        </div>
        <button className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          完整日历
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {Object.entries(grouped).map(([dateKey, items]) => (
          <div key={dateKey}>
            <div className="sticky top-0 mb-2 flex items-center gap-2 bg-card/80 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="text-foreground">{dateKey.split(" · ")[0]}</span>
              <span>·</span>
              <span>{dateKey.split(" · ")[1]}</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <div className="space-y-1.5">
              {items.map((item) => (
                <ScheduleRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  const meta = typeMeta[item.type];
  const Icon = meta.icon;
  return (
    <button className="group flex w-full items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-left transition-colors hover:border-primary hover:bg-popover/50">
      <span className={cn("font-mono text-xs tabular text-muted-foreground")}>
        {item.time ?? "--:--"}
      </span>
      <Icon className={cn("h-4 w-4 shrink-0", meta.color)} />
      <div className="flex-1 overflow-hidden">
        <div className="truncate text-sm font-medium">{item.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {item.matter}
          {item.procedure ? ` · ${item.procedure}` : ""}
        </div>
      </div>
    </button>
  );
}
