import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Users,
  Scale,
  ChevronRight,
  Layers,
  Info
} from "lucide-react";
import { getMatterById } from "@/server/matters/actions";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  matterCategoryLabel,
  matterCategoryColor,
  matterStatusLabel,
  litigationStandingLabel,
  procedureTypeLabel,
  userRoleLabel,
  clientTypeLabel
} from "@/lib/enums";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function MatterDetailPage({ params }: { params: { id: string } }) {
  const matter = await getMatterById(params.id);
  if (!matter) notFound();

  const ourSideParties = matter.parties.filter((p) => p.role === "CLIENT_PARTY");
  const opposingParties = matter.parties.filter((p) => p.role === "OPPOSING_PARTY");
  const thirdParties = matter.parties.filter((p) => p.role === "THIRD_PARTY");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/matters"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回案件列表
        </Link>
      </div>

      {/* 头部 */}
      <header className="rounded-xl border border-border bg-card/40 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="font-mono text-xs text-muted-foreground">{matter.internalCode}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{matter.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs"
                style={{
                  borderColor: `${matterCategoryColor[matter.category]}40`,
                  color: matterCategoryColor[matter.category]
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: matterCategoryColor[matter.category] }}
                />
                {matterCategoryLabel[matter.category]}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {matterStatusLabel[matter.status]}
              </Badge>
              {matter.ourStanding && (
                <Badge variant="secondary" className="text-[10px]">
                  我方：{litigationStandingLabel[matter.ourStanding]}
                </Badge>
              )}
              {matter.counterclaimAsPlaintiff && (
                <Badge variant="secondary" className="text-[10px]">
                  反诉原告
                </Badge>
              )}
              {matter.counterclaimAsDefendant && (
                <Badge variant="secondary" className="text-[10px]">
                  反诉被告
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-5" />

        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <InfoItem icon={<Briefcase className="h-3.5 w-3.5" />} label="案由">
            {matter.cause?.name ?? matter.causeFreeText ?? "—"}
          </InfoItem>
          <InfoItem icon={<Scale className="h-3.5 w-3.5" />} label="标的金额" mono>
            {matter.claimAmount ? formatCurrency(Number(matter.claimAmount)) : "—"}
          </InfoItem>
          <InfoItem icon={<Calendar className="h-3.5 w-3.5" />} label="收案日期">
            {matter.intakeDate ? formatDate(matter.intakeDate) : "—"}
          </InfoItem>
          <InfoItem icon={<Calendar className="h-3.5 w-3.5" />} label="首次立案">
            {matter.firstAcceptedAt ? formatDate(matter.firstAcceptedAt) : "—"}
          </InfoItem>
        </dl>
      </header>

      {/* 当事人 */}
      <section className="rounded-xl border border-border bg-card/40 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Users className="h-4 w-4 text-primary" />
          当事人
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <PartyColumn title="委托方" color="#5B8DEF">
            {matter.clientLinks.length === 0 && ourSideParties.length === 0 ? (
              <Empty />
            ) : (
              <>
                {matter.clientLinks.map((cl) => (
                  <PartyCard
                    key={cl.clientId}
                    href={`/clients/${cl.client.id}`}
                    name={cl.client.name}
                    sub={clientTypeLabel[cl.client.type]}
                    primary={cl.isPrimary}
                  />
                ))}
                {ourSideParties.map((p) => (
                  <PartyCard key={p.id} name={p.name} sub={p.idNumber ?? undefined} />
                ))}
              </>
            )}
          </PartyColumn>

          <PartyColumn title="对方" color="#FB923C">
            {opposingParties.length === 0 ? (
              <Empty />
            ) : (
              opposingParties.map((p) => (
                <PartyCard key={p.id} name={p.name} sub={p.idNumber ?? undefined} />
              ))
            )}
          </PartyColumn>

          <PartyColumn title="第三人" color="#9B7BF7">
            {thirdParties.length === 0 ? (
              <Empty />
            ) : (
              thirdParties.map((p) => (
                <PartyCard key={p.id} name={p.name} sub={p.idNumber ?? undefined} />
              ))
            )}
          </PartyColumn>
        </div>
      </section>

      {/* 程序阶段 */}
      <section className="rounded-xl border border-border bg-card/40 p-6">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Layers className="h-4 w-4 text-primary" />
            程序阶段{" "}
            <span className="text-muted-foreground">({matter.procedures.length})</span>
          </h2>
          <span className="text-xs text-muted-foreground">
            添加更多程序、工作阶段、期限和开庭功能在下个版本上线
          </span>
        </header>

        <div className="space-y-3">
          {matter.procedures.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg border p-4 ${
                p.engagement === "INFORMATIONAL"
                  ? "border-dashed border-border bg-background/20 opacity-60"
                  : "border-border bg-background/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground tabular">
                      程序 {p.order}
                    </span>
                    <span className="text-sm font-medium">
                      {procedureTypeLabel[p.type]}
                    </span>
                    {p.engagement === "INFORMATIONAL" && (
                      <Badge variant="outline" className="text-[10px]">
                        前序参考
                      </Badge>
                    )}
                  </div>
                  {p.caseNumber && (
                    <div className="mt-1 font-mono text-xs text-muted-foreground tabular">
                      {p.caseNumber}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {p.status === "IN_PROGRESS" ? "进行中" : p.status === "CONCLUDED" ? "已结" : "待启动"}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                <Slot label="办理机关">{p.handlingAgency ?? "—"}</Slot>
                <Slot label="立案日">{p.acceptedAt ? formatDate(p.acceptedAt) : "—"}</Slot>
                <Slot label="结案日">{p.concludedAt ? formatDate(p.concludedAt) : "—"}</Slot>
                <Slot label="结果">{p.outcome ?? "—"}</Slot>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 团队 */}
      <section className="rounded-xl border border-border bg-card/40 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Users className="h-4 w-4 text-primary" />
          团队成员
        </h2>
        <ul className="space-y-2">
          {matter.members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-md border border-border bg-background/40 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-xs font-semibold text-primary">
                  {m.user.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{m.user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {userRoleLabel[m.user.role]}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {m.role === "LEAD" ? "主办" : m.role === "CO_LEAD" ? "协办" : "助理"}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      {/* TODO 提示 */}
      <div className="rounded-lg border border-dashed border-border bg-card/20 p-4 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5" />
          <p>
            下一版本将上线：程序内工作阶段 / 开庭与期限 / 沟通记录 / 材料 / 财务结算 / 时间线。
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  mono,
  children
}: {
  icon: React.ReactNode;
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className={`mt-1 ${mono ? "font-mono tabular" : ""}`}>{children}</dd>
    </div>
  );
}

function PartyColumn({
  title,
  color,
  children
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function PartyCard({
  name,
  sub,
  primary,
  href
}: {
  name: string;
  sub?: string;
  primary?: boolean;
  href?: string;
}) {
  const inner = (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2 transition-colors hover:bg-popover/40">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{name}</span>
        {primary && (
          <Badge variant="secondary" className="text-[10px]">
            主
          </Badge>
        )}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        <div className="flex items-center gap-1">
          <div className="flex-1">{inner}</div>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </div>
      </Link>
    );
  }
  return inner;
}

function Empty() {
  return <div className="rounded-md border border-dashed border-border py-2 text-center text-[11px] text-muted-foreground">—</div>;
}

function Slot({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-foreground">{children}</div>
    </div>
  );
}
