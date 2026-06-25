import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CheckCircle2,
  FolderOpen,
  Users,
  UserX,
  Wallet,
  Calendar,
  ClipboardCheck,
  Settings,
  BarChart3,
  Gavel,
  FileText,
  Phone
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
// v0.37: 快递/工具/服务中心 移入顶栏「应用」菜单，不再占侧边
// v0.45: 暂时隐藏"保全"一级入口，代码与路由保留以便恢复
export const primaryNav: NavItem[] = [
  { label: "工作台", href: "/", icon: LayoutDashboard },
  { label: "待办", href: "/tasks", icon: CheckCircle2 },
  { label: "案件", href: "/matters", icon: FolderOpen },
  { label: "民事案件", href: "/matters?categoryGroup=civil", icon: FolderOpen },
  { label: "刑事案件", href: "/matters?categoryGroup=criminal", icon: Gavel },
  { label: "非诉案件", href: "/matters?categoryGroup=nonLitigation", icon: FileText },
  { label: "公共案源", href: "/matters?categoryGroup=publicSource", icon: FileText },
  { label: "顾问", href: "/matters?categoryGroup=legalCounsel", icon: FileText },
  { label: "专项", href: "/matters?categoryGroup=specialProject", icon: FileText },
  { label: "代立案", href: "/matters?categoryGroup=agentFiling", icon: FileText },
  { label: "咨询", href: "/matters?categoryGroup=consultation", icon: FileText },
  { label: "潜在客户", href: "/potential-clients", icon: UserX },
  { label: "客户", href: "/clients", icon: Users },
  { label: "对方当事人", href: "/opposing-parties", icon: UserX },
  { label: "财务", href: "/finance", icon: Wallet },
  { label: "日程", href: "/schedule", icon: Calendar },
  { label: "通讯录", href: "/contacts", icon: Phone }
];

export const secondaryNav: NavItem[] = [
  { label: "报表", href: "/reports", icon: BarChart3 },
  // v0.43: 「审计」入口移除（审计日志在 设置 → 审计日志）
  { label: "设置", href: "/settings", icon: Settings }
];
