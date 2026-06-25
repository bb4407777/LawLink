import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, User, Briefcase } from "lucide-react";
import { getOpposingPartyById } from "@/server/opposing-parties/actions";
import { Badge } from "@/components/ui/badge";
import { opposingPartyTypeLabel, matterCategoryLabel, matterStatusLabel } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { OpposingPartyEditButton } from "./_components/opposing-party-edit-button";
import { PartyType } from "@prisma/client";

const dash = <span className="text-muted-foreground/50">—</span>;

const typeIcons: Record<string, typeof User> = {
  NATURAL_PERSON: User,
  COMPANY: Building2,
  PARTNERSHIP: Briefcase,
  INDIVIDUAL_BUSINESS: Briefcase,
  INSTITUTION: Building2,
  SOCIAL_ORG: Briefcase,
  GOVERNMENT: Building2,
  OTHER_ORG: Briefcase,
  ORGANIZATION: Briefcase
};

export default async function OpposingPartyDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const op = await getOpposingPartyById(id);
  if (!op) notFound();

  const isCompany =
    op.partyType !== "NATURAL_PERSON" && op.partyType !== "INDIVIDUAL_BUSINESS";
  const TypeIcon = typeIcons[op.partyType] ?? User;

  return (
    <div className="space-y-4">
      <Link
        href="/opposing-parties"
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回对方当事人列表
      </Link>

      {/* ① 基本信息 */}
      <section className="rounded-xl border border-border bg-card p-4">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/15 ring-1 ring-destructive/30">
              <TypeIcon className="h-4 w-4 text-destructive" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">{op.name}</h1>
            <Badge variant="secondary" className="text-[10px]">
              {opposingPartyTypeLabel[op.partyType]}
            </Badge>
          </div>
          <OpposingPartyEditButton opposingParty={op} />
        </header>

        <dl className="grid grid-cols-[84px_minmax(0,1fr)] gap-px overflow-hidden rounded-md border border-border bg-border text-[12.5px] sm:grid-cols-[84px_minmax(0,1fr)_84px_minmax(0,1fr)]">
          <L>编号</L>
          <V mono title={op.internalCode ?? undefined}>{op.internalCode || dash}</V>
          <L>主体类型</L>
          <V>{opposingPartyTypeLabel[op.partyType]}</V>

          {isCompany ? (
            <>
              <L>信用代码</L>
              <V mono title={op.idNumber ?? undefined}>{op.idNumber || dash}</V>
              <L>法定代表人</L>
              <V title={op.legalRep ?? undefined}>{op.legalRep || dash}</V>
            </>
          ) : (
            <>
              <L>身份证号</L>
              <V mono title={op.idNumber ?? undefined}>{op.idNumber || dash}</V>
              <L>&nbsp;</L>
              <V>&nbsp;</V>
            </>
          )}

          <L>联系电话</L>
          <V mono title={op.phone ?? undefined}>{op.phone || dash}</V>
          <L>&nbsp;</L>
          <V>&nbsp;</V>

          <L>地址</L>
          <V wide title={op.address ?? undefined}>{op.address || dash}</V>

          {op.tags.length > 0 && (
            <>
              <L>标签</L>
              <V wide nowrap={false}>
                <span className="flex flex-wrap gap-1">
                  {op.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </span>
              </V>
            </>
          )}
          {op.notes && (
            <>
              <L>备注</L>
              <V wide nowrap={false}>
                <span className="whitespace-pre-wrap">{op.notes}</span>
              </V>
            </>
          )}
        </dl>
      </section>

      {/* ② 关联案件 */}
      <section className="rounded-xl border border-border bg-card p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            关联案件
            <span className="text-muted-foreground">({op.parties.length})</span>
          </h2>
        </header>

        {op.parties.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">暂无关联案件</p>
        ) : (
          <ul className="divide-y divide-border">
            {op.parties.map((p) => {
              const m = p.matter;
              if (!m) return null;
              return (
              <li key={p.id} className="py-2.5">
                <Link
                  href={`/matters/${m.id}`}
                  className="group block min-w-0"
                >
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
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function L({ children }: { children: React.ReactNode }) {
  return (
    <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] leading-snug text-muted-foreground">
      {children}
    </dt>
  );
}

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
