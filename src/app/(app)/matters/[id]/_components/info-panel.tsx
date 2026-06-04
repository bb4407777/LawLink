"use client";

import { useState } from "react";
import { Pencil, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { matterCategoryLabel, matterCategoryKind } from "@/lib/enums";
import { formatDate, cn } from "@/lib/utils";
import type { MatterPayload, UserOption, FinancePayload } from "./matter-detail-tabs";
import { TeamEditorDialog } from "./team-editor-dialog";
import { RelatedMattersField } from "./related-matters-field";

export function InfoPanel({
  matter,
  userOptions,
  finance,
  contracts
}: {
  matter: MatterPayload;
  userOptions: UserOption[];
  finance: FinancePayload;
  /** v0.43 项1：委托合同 = 收案（审批）阶段上传、绑定本案的文件 */
  contracts: { id: string; name: string }[];
}) {
  const [teamEditorOpen, setTeamEditorOpen] = useState(false);

  const sortedMembers = matter.members.slice().sort((a, b) => {
    const order = { LEAD: 0, CO_LEAD: 1, ASSISTANT: 2 } as const;
    return order[a.role] - order[b.role];
  });
  const lead = sortedMembers.find((m) => m.role === "LEAD");
  const others = sortedMembers.filter((m) => m.role !== "LEAD");

  const primaryClientName = matter.primaryClient?.name
    ?? matter.clientLinks.find((cl) => cl.isPrimary)?.client.name
    ?? matter.clientLinks[0]?.client.name
    ?? null;

  const coLabel =
    others.length === 0
      ? "—"
      : others
          .map((m) => `${m.user.name}（${m.role === "CO_LEAD" ? "协办" : "助理"}）`)
          .join("，");
  // 客户明细
  const client = matter.primaryClient;
  const clientContact = client?.contacts?.[0] ?? null;
  const clientId = client?.idNumber ?? null;
  const clientContactName = clientContact?.name ?? null;
  const clientPhone = clientContact?.phone ?? client?.phone ?? null;

  // 其他案件当事人（相对方 / 第三方 / 关联方）
  const otherParties = matter.parties
    .filter(
      (p) =>
        p.role === "OPPOSING_PARTY" || p.role === "THIRD_PARTY" || p.role === "OTHER"
    )
    .map((p) => ({
      id: p.id,
      label: p.role === "THIRD_PARTY" ? "第三方" : p.role === "OTHER" ? "关联方" : "相对方",
      name: p.name,
      idNumber:
        p.partyType !== "NATURAL_PERSON" ? p.enterpriseSocialCode : p.idNumber,
      contactName: p.contactName,
      phone: p.phone
    }));

  // 关联案件（双向合并去重）
  const relatedMatters = [
    ...matter.linksFrom.map((l) => l.relatedMatter),
    ...matter.linksTo.map((l) => l.matter)
  ].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);

  // 财务：开票 / 回款
  const fmtMoney = (n: number) =>
    n ? `¥${n.toLocaleString()}` : "¥0";
  const counterclaim = matter.intake?.counterclaim ?? false;

  // v0.35: 按案件类别分叉展示（诉讼/仲裁 vs 非诉/专项 vs 顾问）
  const kind = matterCategoryKind(matter.category);
  const period = (s: Date | null, e: Date | null) => {
    if (!s && !e) return "—";
    return `${s ? formatDate(s) : "—"} ~ ${e ? formatDate(e) : "—"}`;
  };
  // v0.42 项11：案件信息表展示「所内案号」（状态已在页头 Pill 体现）
  const firmCaseNoCell = matter.firmCaseNo ? (
    <span className="font-mono tabular text-[12px]">{matter.firmCaseNo}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
  const claimCell = matter.claimAmount ? (
    <span className="font-mono tabular">¥{Number(matter.claimAmount).toLocaleString()}</span>
  ) : (
    "—"
  );

  return (
    <div className="space-y-4">
      {/* —— 案件信息：全宽，明暗分栏表格，灵活每行多列 —— */}
      <section className="rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-[13px] font-medium">
            案件信息
            <span className="ml-1.5 font-mono text-[11px] font-normal tabular text-muted-foreground/70">
              丨 {matter.internalCode}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTeamEditorOpen(true)}
            className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.8} />
            编辑
          </Button>
        </header>
        <div className="overflow-hidden rounded-b-lg">
          {/* 行1：收案时间(1/4) | 案件类型(1/4) | 案件名称(1/2) */}
          <InfoRow>
            <Pair label="收案时间">
              {matter.intakeDate ? formatDate(matter.intakeDate) : "—"}
            </Pair>
            <Pair label="案件类型">{matterCategoryLabel[matter.category]}</Pair>
            <Pair label="案件名称" grow>
              <span className="font-medium" title={matter.title || undefined}>
                {matter.title || "—"}{matterCategoryKind(matter.category) !== "project" ? "案" : ""}
              </span>
            </Pair>
          </InfoRow>
          {/* 行2：按类别分叉 —— 诉讼/仲裁 vs 非诉/专项 vs 顾问 */}
          {kind === "litigation" && (
            <InfoRow>
              <Pair label="案由">{matter.cause?.name ?? matter.causeFreeText ?? "—"}</Pair>
              <Pair label="标的">{claimCell}</Pair>
              <Pair label="是否反诉">{counterclaim ? "是" : "否"}</Pair>
              <Pair label="所内案号">{firmCaseNoCell}</Pair>
            </InfoRow>
          )}
          {kind === "project" && (
            <>
              <InfoRow>
                <Pair label="业务类型">{matter.businessType || "—"}</Pair>
                <Pair label="项目金额">{claimCell}</Pair>
                <Pair label="起止时间">{period(matter.serviceStart, matter.serviceEnd)}</Pair>
                <Pair label="所内案号">{firmCaseNoCell}</Pair>
              </InfoRow>
              <InfoRow>
                <Pair label="服务范围" grow>
                  {matter.serviceScope || "—"}
                </Pair>
                <Pair label="交付成果">{matter.deliverables || "—"}</Pair>
              </InfoRow>
            </>
          )}
          {kind === "counsel" && (
            <>
              <InfoRow>
                <Pair label="顾问类型">{matter.counselType || "—"}</Pair>
                <Pair label="顾问期限">{period(matter.serviceStart, matter.serviceEnd)}</Pair>
                <Pair label="所内案号">{firmCaseNoCell}</Pair>
              </InfoRow>
              <InfoRow>
                <Pair label="服务范围" grow>
                  {matter.serviceScope || "—"}
                </Pair>
              </InfoRow>
            </>
          )}
          {/* 行3：主办律师 | 协办律师/助理 | 开票金额 | 回款金额 */}
          <InfoRow>
            <Pair label="主办律师">{lead ? lead.user.name : "—"}</Pair>
            <Pair label="协办人员">{coLabel}</Pair>
            <Pair label="开票金额">
              <span className="font-mono tabular">{fmtMoney(finance.stats.invoiced)}</span>
            </Pair>
            <Pair label="实收案款">
              <span className="font-mono tabular">{fmtMoney(finance.stats.received)}</span>
            </Pair>
          </InfoRow>
          {/* 行4：客户 | 证件号码 | 联系人 | 联系电话 */}
          <InfoRow>
            <Pair label="客户">{primaryClientName ?? "—"}</Pair>
            <Pair label="证件号码">
              <span className="font-mono tabular">{clientId ?? "—"}</span>
            </Pair>
            <Pair label="联系人">{clientContactName ?? "—"}</Pair>
            <Pair label="联系电话">
              <span className="font-mono tabular">{clientPhone ?? "—"}</span>
            </Pair>
          </InfoRow>
          {/* 行5：其他案件当事人（每人一行）*/}
          {otherParties.map((op) => (
            <InfoRow key={op.id}>
              <Pair label={op.label}>{op.name || "—"}</Pair>
              <Pair label="证件号码">
                <span className="font-mono tabular">{op.idNumber || "—"}</span>
              </Pair>
              <Pair label="联系人">{op.contactName || "—"}</Pair>
              <Pair label="联系电话">
                <span className="font-mono tabular">{op.phone || "—"}</span>
              </Pair>
            </InfoRow>
          ))}
          {/* 行6：委托合同 | 关联案件 各占一半 —— v0.43 项1 */}
          <InfoRow>
            <Pair label="委托合同">
              <DelegationContracts contracts={contracts} />
            </Pair>
            <Pair label="关联案件">
              <RelatedMattersField matterId={matter.id} related={relatedMatters} />
            </Pair>
          </InfoRow>
        </div>
      </section>

      <TeamEditorDialog
        open={teamEditorOpen}
        onOpenChange={setTeamEditorOpen}
        matterId={matter.id}
        matterMeta={{
          internalCode: matter.internalCode,
          intakeDate: matter.intakeDate ?? null,
          category: matter.category,
          title: matter.title,
          causeId: matter.causeId ?? null,
          causeFreeText: matter.causeFreeText ?? null,
          claimAmount:
            matter.claimAmount === null || matter.claimAmount === undefined
              ? null
              : Number(matter.claimAmount),
          ourStanding: matter.ourStanding ?? null
        }}
        currentOwnerId={matter.ownerId}
        currentMembers={matter.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: m.user.name
        }))}
        userOptions={userOptions}
      />
    </div>
  );
}

/* —— Sub-components —— */

// v0.43 项1：委托合同——收案上传、绑定本案的文件，点击文件名在浏览器内打开
function DelegationContracts({ contracts }: { contracts: { id: string; name: string }[] }) {
  if (contracts.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {contracts.map((c) => (
        <a
          key={c.id}
          href={`/api/documents/${c.id}/download?inline=1`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[12px] hover:text-primary"
          title={c.name}
        >
          <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="max-w-[180px] truncate">{c.name}</span>
        </a>
      ))}
    </div>
  );
}

// 一行：移动端纵向堆叠（pair 间横线），md+ 横向排列（pair 间竖线）
export function InfoRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-border border-b border-border last:border-b-0 md:flex-row md:divide-x md:divide-y-0">
      {children}
    </div>
  );
}

// 一个标签-取值对：标签灰底（暗），取值白底（亮）
export function Pair({
  label,
  grow,
  tight,
  children
}: {
  label: string;
  grow?: boolean;
  /** 只占内容宽度（值不换行），用于系统编号/收案时间等短字段，避免撑成两行 */
  tight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0",
        tight ? "md:flex-none" : grow ? "md:flex-[2]" : "md:flex-1"
      )}
    >
      <div className="w-[68px] shrink-0 border-r border-border bg-muted/50 px-2.5 py-2 text-[11.5px] leading-snug text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "min-w-0 flex-1 bg-card px-2.5 py-2 text-[12.5px] leading-snug text-foreground/95",
          tight ? "whitespace-nowrap" : "break-words"
        )}
      >
        {children}
      </div>
    </div>
  );
}
