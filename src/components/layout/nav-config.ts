import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Users,
  Wallet,
  Calendar,
  FileBox,
  Settings
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

export const primaryNav: NavItem[] = [
  { label: "仪表盘", href: "/", icon: LayoutDashboard },
  { label: "收案", href: "/intakes", icon: FileText, badge: 5 },
  { label: "案件", href: "/matters", icon: FolderOpen, badge: 18 },
  { label: "客户", href: "/clients", icon: Users },
  { label: "财务", href: "/finance", icon: Wallet },
  { label: "日程", href: "/schedule", icon: Calendar, badge: 7 },
  { label: "材料", href: "/documents", icon: FileBox }
];

export const secondaryNav: NavItem[] = [
  { label: "设置", href: "/settings", icon: Settings }
];
