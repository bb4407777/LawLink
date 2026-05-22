"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { todoItems, type TodoItem } from "@/lib/mock-data";

const severityStyle: Record<TodoItem["severity"], string> = {
  blocking: "bg-[#F87171] shadow-[0_0_8px_rgba(248,113,113,0.6)]",
  urgent: "bg-[#FB923C] shadow-[0_0_8px_rgba(251,146,60,0.5)]",
  normal: "bg-muted-foreground/40"
};

const severityLabel: Record<TodoItem["severity"], string> = {
  blocking: "阻塞",
  urgent: "紧急",
  normal: "普通"
};

export function TodoList() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="flex h-full flex-col rounded-xl border border-border bg-card/40"
    >
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">待我处理</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            按优先级排序，{todoItems.length} 项
          </p>
        </div>
        <button className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          全部
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="flex-1 divide-y divide-border overflow-y-auto">
        {todoItems.map((todo) => (
          <button
            key={todo.id}
            className="group flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-popover/50"
          >
            <span
              className={cn(
                "mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                severityStyle[todo.severity]
              )}
            />
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    todo.severity === "blocking" && "text-[#F87171]",
                    todo.severity === "urgent" && "text-[#FB923C]",
                    todo.severity === "normal" && "text-muted-foreground"
                  )}
                >
                  {severityLabel[todo.severity]}
                </span>
              </div>
              <div className="mt-1 text-sm font-medium leading-tight">{todo.title}</div>
              <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                {todo.detail}
              </div>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </motion.section>
  );
}
