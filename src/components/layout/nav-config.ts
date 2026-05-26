import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Wallet,
  Calendar,
  Shield,
  Package,
  ClipboardCheck,
  Calculator,
  Archive,
  Settings,
  BarChart3,
  ShieldCheck
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

// v0.4: 一级菜单收紧 —— 收案合并到案件、利益冲突进顶栏、材料只在案件详情
// v0.8.1: 用章统一收口到"审批"（未来可扩文书内审等其他审批类型）
// v0.9.3: 加"快递"
// v0.11: 隐藏"收件箱"（短信解析使用率低，代码与路由保留以便恢复）
export const primaryNav: NavItem[] = [
  { label: "仪表盘", href: "/", icon: LayoutDashboard },
  { label: "案件", href: "/matters", icon: FolderOpen },
  { label: "客户", href: "/clients", icon: Users },
  { label: "财务", href: "/finance", icon: Wallet },
  { label: "日程", href: "/schedule", icon: Calendar },
  { label: "保全", href: "/preservation", icon: Shield },
  { label: "快递", href: "/express", icon: Package },
  { label: "审批", href: "/approvals/seals", icon: ClipboardCheck }
];

// 注：sidebar"工具"项的 href 是 sentinel — Sidebar 拦截 onClick 改为弹窗，不真跳转
export const secondaryNav: NavItem[] = [
  { label: "工具", href: "#tools", icon: Calculator },
  { label: "归档", href: "/archive", icon: Archive },
  { label: "报表", href: "/reports", icon: BarChart3 },
  { label: "审计", href: "/audit", icon: ShieldCheck },
  { label: "设置", href: "/settings", icon: Settings }
];
