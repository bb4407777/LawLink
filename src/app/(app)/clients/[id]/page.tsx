import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  User,
  Briefcase,
  Wallet,
  Coins,
  Clock,
  FileText
} from "lucide-react";
import { getClientById, getClientFinanceSummary } from "@/server/clients/actions";
import { Badge } from "@/components/ui/badge";
import {
  clientTypeLabel,
  cooperationStatusLabel,
  genderLabel,
  matterCategoryLabel,
  matterStatusLabel
} from "@/lib/enums";
import { cn } from "@/lib/utils";
import { ClientEditButton } from "./_components/client-edit-button";

const billingStatusLabel: Record<string, string> = {
  DRAFT: "草稿",
  ACTIVE: "生效中",
  CLOSED: "已结"
};
const yuan = (n: number) => `¥${n.toLocaleString()}`;
const dash = <span className="text-muted-foreground/50">—</span>;

const COOP_TONE: Record<string, string> = {
  POTENTIAL: "bg-amber-100 text-amber-800",
  NEGOTIATING: "bg-sky-100 text-sky-800",
  SIGNED: "bg-emerald-100 text-emerald-800",
  TERMINATED: "bg-muted text-muted-foreground"
};

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();
  const finance = await getClientFinanceSummary(params.id);

  const isIndividual = client.type === "INDIVIDUAL";
  const TypeIcon = isIndividual ? User : client.type === "COMPANY" ? Building2 : Briefcase;
  // 企业客户：主要联系人（contacts 已按 isPrimary desc 排序）
  const primaryContact = client.contacts[0] ?? null;

  // 按案件分组合同，关联案件与签约合同合并展示（左案件 / 右合同）
  const billingsByMatter = new Map<string, typeof finance.billings>();
  for (const b of finance.billings) {
    const arr = billingsByMatter.get(b.matter.id) ?? [];
    arr.push(b);
    billingsByMatter.set(b.matter.id, arr);
  }

  return (
    <div className="space-y-4">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回客户列表
      </Link>

      {/* ① 客户信息 */}
      <section className="rounded-xl border border-border bg-card p-4">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <TypeIcon className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">{client.name}</h1>
            <Badge variant="secondary" className="text-[10px]">
              {clientTypeLabel[client.type]}
            </Badge>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                COOP_TONE[client.cooperationStatus] ?? "bg-muted text-muted-foreground"
              )}
            >
              {cooperationStatusLabel[client.cooperationStatus]}
            </span>
          </div>
          <ClientEditButton client={client} />
        </header>

        {/* 固定 4 列网格：标签|值|标签|值，全表列宽统一对齐；值单行截断，长字段跨整行 */}
        <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-px overflow-hidden rounded-md border border-border bg-border text-[12.5px] sm:grid-cols-[84px_minmax(0,1fr)_84px_minmax(0,1fr)]">
          <L>客户编号</L>
          <V mono title={client.internalCode ?? undefined}>{client.internalCode || dash}</V>
          <L>客户类型</L>
          <V>{clientTypeLabel[client.type]}</V>

          <L>合作状态</L>
          <V>{cooperationStatusLabel[client.cooperationStatus]}</V>
          <L>客户来源</L>
          <V title={client.source ?? undefined}>{client.source || dash}</V>

          {isIndividual ? (
            <>
              <L>所属行业</L>
              <V title={client.industry ?? undefined}>{client.industry || dash}</V>
              <L>民族</L>
              <V>{client.ethnicity || dash}</V>

              <L>身份证号</L>
              <V mono title={client.idNumber ?? undefined}>{client.idNumber || dash}</V>
              <L>性别</L>
              <V>{client.gender ? genderLabel[client.gender] : dash}</V>

              <L>联系电话</L>
              <V mono title={client.phone ?? undefined}>{client.phone || dash}</V>
              <L>邮箱</L>
              <V title={client.email ?? undefined}>{client.email || dash}</V>
            </>
          ) : (
            <>
              <L>所属行业</L>
              <V title={client.industry ?? undefined}>{client.industry || dash}</V>
              <L>法定代表人</L>
              <V title={client.legalRep ?? undefined}>{client.legalRep || dash}</V>

              <L>信用代码</L>
              <V mono title={client.idNumber ?? undefined}>{client.idNumber || dash}</V>
              <L>邮箱</L>
              <V title={client.email ?? undefined}>{client.email || dash}</V>

              <L>联系人</L>
              <V title={primaryContact?.name}>{primaryContact?.name || dash}</V>
              <L>联系电话</L>
              <V mono title={primaryContact?.phone ?? client.phone ?? undefined}>
                {primaryContact?.phone || client.phone || dash}
              </V>
            </>
          )}

          <L>住所地</L>
          <V wide title={client.address ?? undefined}>{client.address || dash}</V>

          {client.tags.length > 0 && (
            <>
              <L>标签</L>
              <V wide nowrap={false}>
                <span className="flex flex-wrap gap-1">
                  {client.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </span>
              </V>
            </>
          )}
          {client.notes && (
            <>
              <L>备注</L>
              <V wide nowrap={false}>
                <span className="whitespace-pre-wrap">{client.notes}</span>
              </V>
            </>
          )}
        </dl>
      </section>

      {/* ② 财务概览 */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <FinanceStat icon={<Wallet className="h-4 w-4" />} label="签约合同总额" value={yuan(finance.contractTotal)} accent />
        <FinanceStat icon={<Coins className="h-4 w-4" />} label="已收款" value={yuan(finance.received)} />
        <FinanceStat icon={<Clock className="h-4 w-4" />} label="待收款" value={yuan(finance.pending)} />
        <FinanceStat icon={<Briefcase className="h-4 w-4" />} label="关联案件" value={`${finance.matterCount} 件`} />
      </div>

      {/* ③ 关联案件与合同（左案件 / 右对应合同）*/}
      <section className="rounded-xl border border-border bg-card p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Briefcase className="h-4 w-4 text-primary" />
            关联案件与合同 <span className="text-muted-foreground">({client.matters.length})</span>
          </h2>
          <span className="text-xs text-muted-foreground">
            合同合计 <span className="font-mono text-foreground">{yuan(finance.contractTotal)}</span>
          </span>
        </header>

        {client.matters.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">暂无关联案件</p>
        ) : (
          <ul className="divide-y divide-border">
            {client.matters.map((m) => {
              const bs = billingsByMatter.get(m.id) ?? [];
              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                >
                  {/* 左：案件 */}
                  <Link href={`/matters/${m.id}`} className="group min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium transition-colors group-hover:text-primary">
                      {m.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{m.internalCode}</span>
                      <span>·</span>
                      <span>{matterCategoryLabel[m.category]}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {matterStatusLabel[m.status]}
                      </Badge>
                    </div>
                  </Link>

                  {/* 右：该案对应合同 */}
                  <div className="shrink-0 sm:w-[320px]">
                    {bs.length === 0 ? (
                      <span className="text-xs text-muted-foreground/60">暂无合同</span>
                    ) : (
                      <ul className="space-y-1">
                        {bs.map((b) => (
                          <li
                            key={b.id}
                            className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
                          >
                            <span className="min-w-0 flex-1 truncate text-xs" title={b.title}>
                              <FileText className="mr-1 inline h-3 w-3 text-muted-foreground" />
                              {b.title}
                              {b.signedAt && (
                                <span className="ml-1.5 text-muted-foreground/70">
                                  {new Date(b.signedAt).toLocaleDateString("zh-CN")}
                                </span>
                              )}
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              <span className="font-mono text-xs">{yuan(b.contractAmount)}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {billingStatusLabel[b.status] ?? b.status}
                              </Badge>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function FinanceStat({
  icon,
  label,
  value,
  accent
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        accent ? "border-primary/30 bg-primary/[0.04]" : "border-border bg-card"
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={accent ? "text-primary" : ""}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

// 客户信息表：标签格（灰底）
function L({ children }: { children: React.ReactNode }) {
  return (
    <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] leading-snug text-muted-foreground">
      {children}
    </dt>
  );
}

// 客户信息表：取值格（白底）。默认单行截断；wide 跨整行；nowrap=false 允许换行（标签/备注）
function V({
  children,
  mono,
  wide,
  nowrap = true,
  title
}: {
  children: React.ReactNode;
  mono?: boolean;
  wide?: boolean;
  nowrap?: boolean;
  title?: string;
}) {
  return (
    <dd
      title={title}
      className={cn(
        "min-w-0 bg-card px-2.5 py-2 leading-snug text-foreground/95",
        mono && "font-mono",
        nowrap && "truncate",
        wide && "col-span-1 sm:col-span-3"
      )}
    >
      {children}
    </dd>
  );
}
