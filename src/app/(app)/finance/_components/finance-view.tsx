"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Wallet,
  Coins,
  TrendingUp,
  Percent,
  Receipt,
  FileText,
  ClipboardList,
  Plus,
  Trash2,
  Search,
  Loader2,
  Building2,
  X
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { RadioChips } from "@/components/ui/radio-chips";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const feeTypeLabel = {
  RECEIVABLE: "应收",
  RECEIVED: "实收",
  REFUND: "退款",
  COST: "成本",
  COMMISSION: "分成"
} as const;

const feeTypeColor: Record<keyof typeof feeTypeLabel, string> = {
  RECEIVABLE: "#FBBF24",
  RECEIVED: "#4ADE80",
  REFUND: "#F87171",
  COST: "#FB923C",
  COMMISSION: "#9B7BF7"
};

type Entry = {
  id: string;
  type: keyof typeof feeTypeLabel;
  amount: { toString(): string };
  occurredAt: Date;
  payerOrPayee: string | null;
  note: string | null;
  matter: { id: string; internalCode: string; title: string };
  beneficiaryUser: { id: string; name: string } | null;
  recordedBy: { id: string; name: string };
};

import type { InvoiceRequestStatus } from "@prisma/client";
import { InvoiceManagementSection } from "./invoice-management";
import { InvoiceCreateDialog } from "./invoice-create-dialog";
import {
  upsertFeeEntryByType,
  updateFeeEntry,
  deleteFeeEntry,
  searchMattersForFeeEntry
} from "@/server/finance/actions";

export type InvoiceRequestRow = {
  id: string;
  amount: number;
  title: string | null;
  status: InvoiceRequestStatus;
  requestNote: string | null;
  requestedAt: Date;
  processedAt: Date | null;
  processNote: string | null;
  invoiceNo: string | null;
  issuedAt: Date | null;
  // v0.42 开票类型 + 抬头 + 专票六要素（来自 InvoiceRequest 标量字段）
  invoiceType: "PLAIN" | "SPECIAL" | null;
  invoiceItem: "LAWYER_FEE" | "CONSULTING_FEE" | "AGENCY_FEE" | "OTHER" | null;
  buyerName: string | null;
  buyerTaxNo: string | null;
  buyerAddress: string | null;
  buyerPhone: string | null;
  buyerBank: string | null;
  buyerBankAccount: string | null;
  // v0.43 项5：matter 可空（无关联案件开票）
  matter: { id: string; internalCode: string; title: string } | null;
  noMatterReason: string | null;
  requestedBy: { id: string; name: string };
  processedBy: { id: string; name: string } | null;
  evidenceDocs: {
    id: string;
    name: string;
    size: number | null;
    mimeType: string | null;
    createdAt: Date;
  }[];
  contractScan: { id: string; name: string } | null;
  invoiceFile: { id: string; name: string } | null;
};

type Props = {
  entries: Entry[];
  monthly: { month: string; received: number; receivable: number }[];
  fullTrend: { month: string; received: number; receivable: number }[];
  stats: {
    monthlyReceived: number;
    monthlyReceivable: number;
    yearlyReceived: number;
    personalMonthly: number;
    personalYearly: number;
    monthlyIssued: number;
    pendingInvoiceCount: number;
  };
  invoiceRequests: InvoiceRequestRow[];
  canApproveInvoice: boolean;
};

const TYPE_FILTERS: ("ALL" | keyof typeof feeTypeLabel)[] = [
  "ALL",
  "RECEIVED",
  "RECEIVABLE",
  "COST",
  "COMMISSION",
  "REFUND"
];

export function FinanceView({
  entries,
  monthly,
  fullTrend,
  stats,
  invoiceRequests,
  canApproveInvoice
}: Props) {
  const [typeFilter, setTypeFilter] = useState<"ALL" | keyof typeof feeTypeLabel>("ALL");
  const [monthFilter, setMonthFilter] = useState("");
  const [tab, setTab] = useState<"overview" | "invoices">("overview");
  const [invoiceCreateOpen, setInvoiceCreateOpen] = useState(false);

  // FeeEntry 快速录入
  const [feeEntryOpen, setFeeEntryOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [isPending, startTransition] = useTransition();
  const [matterQuery, setMatterQuery] = useState("");
  const [matterResults, setMatterResults] = useState<{ id: string; internalCode: string; title: string }[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<{ id: string; internalCode: string; title: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [feeType, setFeeType] = useState("RECEIVED");
  const [feeAmount, setFeeAmount] = useState(0);
  const [feeDate, setFeeDate] = useState(new Date().toISOString().slice(0, 10));
  const [feeNote, setFeeNote] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!matterQuery.trim()) { setMatterResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchMattersForFeeEntry(matterQuery);
        setMatterResults(res);
      } catch { setMatterResults([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [matterQuery]);

  const filtered = entries.filter((e) => {
    if (typeFilter !== "ALL" && e.type !== typeFilter) return false;
    if (monthFilter) {
      const d = new Date(e.occurredAt);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (ym !== monthFilter) return false;
    }
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-medium tracking-tight">财务管理</h1>
            <p className="text-[13px] text-muted-foreground">
              可见范围内的收付流水 + 开票申请 ·{" "}
              <Link href="/matters" className="text-primary hover:underline">
                合同/分成在各案件详情录入
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setFeeEntryOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              新增收付
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setInvoiceCreateOpen(true)}>
              <Receipt className="h-3.5 w-3.5" />
              申请开票
            </Button>
          </div>
        </div>
        <div className="ll-rule" />
      </header>

      <div
        className="flex items-end gap-6 border-b"
      >
        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>
          <Wallet className="h-3.5 w-3.5" strokeWidth={1.8} />
          总览
        </TabBtn>
        <TabBtn active={tab === "invoices"} onClick={() => setTab("invoices")}>
          <Receipt className="h-3.5 w-3.5" strokeWidth={1.8} />
          开票管理
          {stats.pendingInvoiceCount > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {stats.pendingInvoiceCount}
            </span>
          )}
        </TabBtn>
      </div>

      {tab === "invoices" ? (
        <div className="space-y-3">
          <InvoiceManagementSection
            requests={invoiceRequests}
            canApprove={canApproveInvoice}
          />
        </div>
      ) : (
        <>
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard
          label="本月实收"
          value={stats.monthlyReceived}
          icon={<Coins className="h-3.5 w-3.5" />}
          color="#4ADE80"
        />
        <StatCard
          label="本月应收"
          value={stats.monthlyReceivable}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          color="#FBBF24"
        />
        <StatCard
          label="本月已开票"
          value={stats.monthlyIssued}
          icon={<FileText className="h-3.5 w-3.5" />}
          color="#5B8DEF"
        />
        <StatCard
          label="本年实收"
          value={stats.yearlyReceived}
          icon={<Receipt className="h-3.5 w-3.5" />}
          color="#5B8DEF"
        />
        <StatCard
          label="我的本月分成"
          value={stats.personalMonthly}
          icon={<Percent className="h-3.5 w-3.5" />}
          color="#9B7BF7"
        />
        <StatCard
          label="我的本年分成"
          value={stats.personalYearly}
          icon={<Percent className="h-3.5 w-3.5" />}
          color="#9B7BF7"
        />
      </div>

      {/* 月度趋势图 */}
      <section className="rounded-xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">近 6 个月趋势</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="h-0.5 w-3 rounded-full"
                style={{ backgroundColor: "#5B8DEF", boxShadow: "0 0 8px #5B8DEF" }}
              />
              实收
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-0.5 w-3 rounded-full"
                style={{ backgroundColor: "#4FD1C5", boxShadow: "0 0 8px #4FD1C5" }}
              />
              应收
            </span>
          </div>
        </header>
        <div className="p-3" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
              onClick={(e) => {
                const label = e?.activePayload?.[0]?.payload?.month;
                if (label) {
                  const m = parseInt(label.replace("月", ""), 10);
                  const now = new Date();
                  const year = m > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear();
                  setMonthFilter(`${year}-${String(m).padStart(2, "0")}`);
                }
              }}
            >
              <defs>
                <linearGradient id="finance-received" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B8DEF" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5B8DEF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="finance-receivable" x1="0" y1="0" x2="0" y2="1">
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
                width={50}
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: 12
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area
                type="monotone"
                dataKey="receivable"
                name="应收"
                stroke="#4FD1C5"
                strokeWidth={1.5}
                fill="url(#finance-receivable)"
              />
              <Area
                type="monotone"
                dataKey="received"
                name="实收"
                stroke="#5B8DEF"
                strokeWidth={2}
                fill="url(#finance-received)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 全程实收趋势 */}
      <RevenueChart
        data={fullTrend}
        title="全程实收趋势"
        onClick={(month) => {
          const m = month.match(/^(\d{4})年(\d+)月$/);
          if (m) setMonthFilter(`${m[1]}-${m[2].padStart(2, "0")}`);
        }}
      />

      {/* 差异原因 */}
      {(() => {
        const monthEntries = monthFilter
          ? entries.filter((e) => {
              const d = new Date(e.occurredAt);
              const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              return ym === monthFilter;
            })
          : entries;
        const diffMap = new Map<string, { matter: Entry["matter"]; receivable: number; received: number }>();
        for (const e of monthEntries) {
          const g = diffMap.get(e.matter.id) ?? { matter: e.matter, receivable: 0, received: 0 };
          if (e.type === "RECEIVABLE") g.receivable += Number(e.amount);
          if (e.type === "RECEIVED") g.received += Number(e.amount);
          diffMap.set(e.matter.id, g);
        }
        const diffs = [...diffMap.values()]
          .filter((d) => d.receivable !== d.received)
          .sort((a, b) => Math.abs(b.receivable - b.received) - Math.abs(a.receivable - a.received));
        if (diffs.length === 0) return null;
        return (
          <section className="rounded-xl border border-border bg-card">
            <header className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">差异原因（应收≠实收）</h2>
            </header>
            <ul className="divide-y divide-border max-h-48 overflow-y-auto">
              {diffs.map((d) => {
                const diff = d.receivable - d.received;
                return (
                  <li key={d.matter.id} className="flex items-center gap-3 px-5 py-2.5 text-xs">
                    <Link href={`/matters/${d.matter.id}`} className="font-mono text-muted-foreground hover:text-primary shrink-0 w-24 tabular">
                      {d.matter.internalCode}
                    </Link>
                    <Link href={`/matters/${d.matter.id}`} className="truncate text-muted-foreground hover:text-primary transition-colors">
                      {d.matter.title}
                    </Link>
                    <span className="ml-auto font-mono tabular" style={{ color: diff > 0 ? "#FBBF24" : "#F87171" }}>
                      {diff > 0 ? `应收多 ${formatCurrency(diff)}` : `实收多 ${formatCurrency(-diff)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })()}

      {/* 流水 */}
      <section className="rounded-xl border border-border bg-card">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            收付流水{" "}
            <span className="text-muted-foreground">({filtered.length})</span>
          </h2>
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs font-mono"
            />
            {monthFilter && (
              <button
                type="button"
                onClick={() => setMonthFilter("")}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                清除
              </button>
            )}
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
            >
              <SelectTrigger className="h-8 w-28 bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "ALL" ? "全部" : feeTypeLabel[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-xs text-muted-foreground">没有匹配的记录</p>
        ) : (
          <ul className="divide-y divide-border max-h-[640px] overflow-y-auto">
            {(() => {
              const groups = new Map<string, { matter: Entry["matter"]; items: Entry[] }>();
              for (const e of filtered) {
                const g = groups.get(e.matter.id) ?? { matter: e.matter, items: [] };
                g.items.push(e);
                groups.set(e.matter.id, g);
              }
              const sorted = [...groups.values()].sort((a, b) =>
                a.matter.internalCode.localeCompare(b.matter.internalCode, "zh")
              );
              return sorted.map(({ matter, items }) => {
                const recv = items.find((i) => i.type === "RECEIVABLE");
                const recd = items.find((i) => i.type === "RECEIVED");
                return (
                  <li key={matter.id} className="group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-popover">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMatter(matter);
                        const sorted = [...items].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
                        setFeeDate(sorted.length > 0 ? new Date(sorted[0].occurredAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
                        setFeeAmount(sorted.length > 0 ? Number(sorted[0].amount) : 0);
                        setFeeEntryOpen(true);
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 mt-1"
                      title="新增收付"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    </button>
                    <div className="flex flex-col gap-1 min-w-[72px]">
                      {recv && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditEntry(recv);
                            setFeeType(recv.type);
                            setFeeAmount(Number(recv.amount));
                            setFeeDate(new Date(recv.occurredAt).toISOString().slice(0, 10));
                            setFeeNote(recv.note ?? "");
                          }}
                          className="inline-flex h-6 items-center justify-center rounded-md border px-2 text-[10px] font-medium hover:opacity-70 transition-opacity text-left"
                          style={{ borderColor: `${feeTypeColor.RECEIVABLE}50`, color: feeTypeColor.RECEIVABLE }}
                        >
                          应收 {formatCurrency(Number(recv.amount))}
                        </button>
                      )}
                      {recd && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditEntry(recd);
                            setFeeType(recd.type);
                            setFeeAmount(Number(recd.amount));
                            setFeeDate(new Date(recd.occurredAt).toISOString().slice(0, 10));
                          }}
                          className="inline-flex h-6 items-center justify-center rounded-md border px-2 text-[10px] font-medium hover:opacity-70 transition-opacity text-left"
                          style={{ borderColor: `${feeTypeColor.RECEIVED}50`, color: feeTypeColor.RECEIVED }}
                        >
                          实收 {formatCurrency(Number(recd.amount))}
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/matters/${matter.id}`}
                          className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground hover:text-primary"
                        >
                          <span className="font-mono">{matter.internalCode}</span>
                          <span>·</span>
                          <span className="truncate">{matter.title}</span>
                        </Link>
                      </div>
                      {items.filter((i) => i.type === "RECEIVED").map((e) => (
                        <div key={e.id} className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="tabular">{new Date(e.occurredAt).toLocaleDateString("zh-CN")}</span>
                          {e.beneficiaryUser && <span>→ {e.beneficiaryUser.name}</span>}
                          <span>录入：{e.recordedBy.name}</span>
                        </div>
                      ))}
                    </div>
                  </li>
                );
              });
            })()}
          </ul>
        )}
      </section>
        </>
      )}
      {/* 新增收付 Dialog */}
      <Dialog open={feeEntryOpen} onOpenChange={(o) => { setFeeEntryOpen(o); if (!o) { setSelectedMatter(null); setMatterQuery(""); setMatterResults([]); }}}>
        <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-2xl flex-col gap-0 p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>新增收付记录</DialogTitle>
            <DialogDescription className="text-xs">
              先搜索案件，再填写收付信息。日期默认为当天，请修改为实际收款日期。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {/* 案件搜索 */}
            <div className="space-y-2">
              <Label className="text-xs">关联案件</Label>
              {selectedMatter ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-background p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="font-mono text-xs">{selectedMatter.internalCode}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{selectedMatter.title}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMatter(null)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索案件（编号/名称）..."
                    value={matterQuery}
                    onChange={(e) => setMatterQuery(e.target.value)}
                    className="pl-9"
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />}
                  {matterResults.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                      {matterResults.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => { setSelectedMatter(m); setMatterQuery(""); setMatterResults([]); }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                          >
                            <span className="font-mono text-muted-foreground">{m.internalCode}</span>
                            <span className="ml-2">{m.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* 类型 */}
            <div className="space-y-1.5">
              <Label className="text-xs">类型</Label>
              <RadioChips
                size="sm"
                items={[
                  { value: "RECEIVABLE", label: "应收" },
                  { value: "RECEIVED", label: "实收", accent: "#16a34a" },
                  { value: "REFUND", label: "退款", accent: "#dc2626" },
                  { value: "COST", label: "成本" }
                ]}
                value={feeType}
                onChange={(v) => setFeeType(v as string)}
              />
            </div>

            {/* 金额 */}
            <div className="space-y-1.5">
              <Label className="text-xs">金额（元）</Label>
              <Input
                type="number"
                step="0.01"
                className="font-mono tabular"
                placeholder="0.00"
                value={feeAmount || ""}
                onChange={(e) => setFeeAmount(Number(e.target.value) || 0)}
              />
            </div>

            {/* 日期 */}
            <div className="space-y-1.5">
              <Label className="text-xs">发生日期</Label>
              <Input
                type="date"
                value={feeDate}
                onChange={(e) => setFeeDate(e.target.value)}
              />
            </div>

            {/* 备注 */}
            <div className="space-y-1.5">
              <Label className="text-xs">备注</Label>
              <Textarea
                rows={2}
                value={feeNote}
                onChange={(e) => setFeeNote(e.target.value)}
                placeholder="可选"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setFeeEntryOpen(false)} disabled={isPending}>
              取消
            </Button>
            <Button
              disabled={!selectedMatter || !feeAmount || isPending}
              className="gap-1.5"
              onClick={() => {
                startTransition(async () => {
                  try {
                    await upsertFeeEntryByType(
                      selectedMatter!.id,
                      feeType as any,
                      feeAmount,
                      new Date(feeDate)
                    );
                    toast.success(feeType === "RECEIVED" ? "实收已更新" : "已更新");
                    setFeeEntryOpen(false);
                    setSelectedMatter(null);
                    setFeeAmount(0);
                    setFeeDate(new Date().toISOString().slice(0, 10));
                    setFeeNote("");
                    setFeeType("RECEIVED");
                  } catch (err) {
                    toast.error("创建失败", { description: err instanceof Error ? err.message : "" });
                  }
                });
              }}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {feeType === "RECEIVED" ? "记录实收" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑收付 Dialog */}
      <Dialog open={!!editEntry} onOpenChange={(o) => { if (!o) { setEditEntry(null); setSelectedMatter(null); setMatterQuery(""); setMatterResults([]); }}}>
        <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-lg flex-col gap-0 p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>编辑收付记录</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="space-y-1.5">
              <Label className="text-xs">类型</Label>
              <RadioChips
                size="sm"
                items={[
                  { value: "RECEIVABLE", label: "应收" },
                  { value: "RECEIVED", label: "实收", accent: "#16a34a" },
                  { value: "REFUND", label: "退款", accent: "#dc2626" },
                  { value: "COST", label: "成本" }
                ]}
                value={feeType}
                onChange={(v) => setFeeType(v as string)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">金额（元）</Label>
              <Input
                type="number"
                step="0.01"
                className="font-mono tabular"
                value={feeAmount || ""}
                onChange={(e) => setFeeAmount(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">发生日期</Label>
              <Input
                type="date"
                value={feeDate}
                onChange={(e) => setFeeDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">关联案件</Label>
              {editEntry && !selectedMatter && (
                <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2.5 text-xs">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-mono text-muted-foreground">{editEntry.matter.internalCode}</span>
                  <span className="truncate text-muted-foreground">{editEntry.matter.title}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedMatter(editEntry.matter)}
                    className="ml-auto text-[10px] text-primary hover:underline"
                  >
                    更换
                  </button>
                </div>
              )}
              {editEntry && selectedMatter && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索案件（编号/名称）..."
                    value={matterQuery}
                    onChange={(e) => setMatterQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                  {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />}
                  {matterResults.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-40 overflow-y-auto">
                      {matterResults.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => { setSelectedMatter(m); setMatterQuery(""); setMatterResults([]); }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                          >
                            <span className="font-mono text-muted-foreground">{m.internalCode}</span>
                            <span className="ml-2">{m.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="border-t border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={async () => {
                  if (!editEntry) return;
                  if (!confirm(`确定删除 ¥${Number(editEntry.amount).toLocaleString()} 的这笔记录？`)) return;
                  startTransition(async () => {
                    try {
                      await deleteFeeEntry(editEntry.id);
                      toast.success("已删除");
                      setEditEntry(null);
                    } catch (err) {
                      toast.error("删除失败", { description: err instanceof Error ? err.message : "" });
                    }
                  });
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                删除
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEditEntry(null)} disabled={isPending}>
                取消
              </Button>
              <Button
                disabled={!feeAmount || isPending}
                className="gap-1.5"
                onClick={() => {
                  startTransition(async () => {
                    try {
                      const upd: any = {
                        id: editEntry!.id,
                        type: feeType as any,
                        amount: feeAmount,
                        occurredAt: new Date(feeDate),
                        note: feeNote || undefined
                      };
                      if (selectedMatter && editEntry && selectedMatter.id !== editEntry.matter.id) {
                        upd.matterId = selectedMatter.id;
                      }
                      await updateFeeEntry(upd);
                      toast.success("已更新");
                      setEditEntry(null);
                    } catch (err) {
                      toast.error("更新失败", { description: err instanceof Error ? err.message : "" });
                    }
                  });
                }}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                保存
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceCreateDialog
        open={invoiceCreateOpen}
        onOpenChange={setInvoiceCreateOpen}
        canCreateUnlinkedInvoice={canApproveInvoice}
      />
    </motion.div>
  );
}

function TabBtn({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "relative inline-flex items-center gap-1.5 pb-2.5 pt-0.5 text-[13px] transition-colors " +
        (active ? "text-foreground" : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary"
        />
      )}
    </button>
  );
}

function StatCard({
  label,
  value,
  icon,
  color
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="ll-surface relative overflow-hidden px-5 py-4">
      <div className="flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[0.56rem] text-muted-foreground">{label}</span>
      </div>
      <div className="ll-stat mt-3 text-[1.7rem] leading-none text-foreground">
        {formatCurrency(value, { compact: true })}
      </div>
    </div>
  );
}
