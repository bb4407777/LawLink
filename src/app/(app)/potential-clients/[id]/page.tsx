import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { getPotentialClientById } from "@/server/potential-clients/actions";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { PotentialClientEditButton } from "./_components/potential-client-edit-button";

const dash = <span className="text-muted-foreground/50">—</span>;

export default async function PotentialClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pc = await getPotentialClientById(id);
  if (!pc) notFound();

  return (
    <div className="space-y-4">
      <Link href="/potential-clients" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />返回潜在客户列表
      </Link>

      <section className="rounded-xl border border-border bg-card p-4">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <User className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">{pc.name}</h1>
            {pc.internalCode && <Badge variant="secondary" className="text-[10px]">{pc.internalCode}</Badge>}
          </div>
          <PotentialClientEditButton client={pc} />
        </header>

        <dl className="grid grid-cols-[84px_minmax(0,1fr)] gap-px overflow-hidden rounded-md border border-border bg-border text-[12.5px] sm:grid-cols-[84px_minmax(0,1fr)_84px_minmax(0,1fr)]">
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">姓名</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.name}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">类型</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.type === "INDIVIDUAL" ? "个人" : pc.type === "COMPANY" ? "公司" : "组织"}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">电话</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 font-mono text-foreground/95">{pc.phone || dash}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">身份证号</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 font-mono text-foreground/95">{pc.idNumber || dash}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">性别</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.gender === "MALE" ? "男" : pc.gender === "FEMALE" ? "女" : dash}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">微信</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.wechat || dash}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">抖音</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.douyin || dash}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">邮箱</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.email || dash}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">地址</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.address || dash}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">来源</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.source || dash}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">联系日期</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.contactedAt ? formatDate(pc.contactedAt) : dash}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">法定代表人</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.legalRep || dash}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">民族</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.ethnicity || dash}</dd>
          <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">行业</dt>
          <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95">{pc.industry || dash}</dd>
          {pc.notes && (
            <>
              <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] text-muted-foreground">备注</dt>
              <dd className="min-w-0 bg-card px-2.5 py-2 text-foreground/95 sm:col-span-3 whitespace-pre-wrap">{pc.notes}</dd>
            </>
          )}
        </dl>
      </section>
    </div>
  );
}
