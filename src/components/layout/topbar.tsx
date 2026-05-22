"use client";

import { Bell, Search, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/60 px-8 backdrop-blur-xl">
      {/* 搜索框 */}
      <button
        className="group flex h-9 w-80 items-center gap-2 rounded-md border border-border bg-card/40 px-3 text-left text-sm text-muted-foreground transition-colors hover:border-input hover:text-foreground"
        aria-label="全局搜索 (Cmd+K)"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">搜索案件、客户、材料...</span>
        <kbd className="hidden h-5 items-center gap-0.5 rounded border border-border bg-popover px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      {/* 快捷动作 */}
      <Button size="sm" className="h-9 gap-1.5 shadow-[0_0_24px_-6px_rgba(91,141,239,0.45)]">
        <Plus className="h-4 w-4" />
        新建收案
      </Button>

      {/* 通知 */}
      <button
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground transition-colors hover:border-input hover:text-foreground"
        aria-label="通知"
      >
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />
      </button>

      {/* 用户菜单 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-9 items-center gap-2 rounded-md border border-border bg-card/40 px-2 transition-colors hover:border-input">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                叶
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">叶森</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            叶森 · 主办律师
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>个人信息</DropdownMenuItem>
          <DropdownMenuItem>偏好设置</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive">
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
