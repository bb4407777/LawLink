"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  userRoleLabel,
  matterCategoryLabel,
  matterStatusLabel,
  litigationStandingLabel,
  procedureTypeLabel
} from "@/lib/enums";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { calcCourtFee } from "@/lib/legal-calc";
import type { MatterPayload, UserOption, FinancePayload } from "./matter-detail-tabs";
import { TeamEditorDialog } from "./team-editor-dialog";
import { PartiesPanel } from "./parties-panel";

export function InfoPanel({
  matter,
  userOptions,
  finance
}: {
  matter: MatterPayload;
  userOptions: UserOption[];
  finance: FinancePayload;
}) {
  const [teamEditorOpen, setTeamEditorOpen] = useState(false);

  const upcomingDeadlines = matter.procedures
    .flatMap((p) =>
      p.deadlines
        .filter((d) => !d.completed)
        .map((d) => ({ ...d, procedureLabel: p.customLabel ?? p.type }))
    )
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 5);

  const upcomingHearings = matter.procedures
    .flatMap((p) =>
      p.hearings
        .filter((h) => new Date(h.startsAt) >= new Date())
        .map((h) => ({ ...h, procedureLabel: p.customLabel ?? p.type }))
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const nextHearing = upcomingHearings[0];

  const sortedMembers = matter.members.slice().sort((a, b) => {
    const order = { LEAD: 0, CO_LEAD: 1, ASSISTANT: 2 } as const;
    return order[a.role] - order[b.role];
  });
  const lead = sortedMembers.find((m) => m.role === "LEAD");
  const others = sortedMembers.filter((m) => m.role !== "LEAD");

  // 法官 / 仲裁员：取任一程序的第一个开庭里登记的
  const judge =
    matter.procedures
      .flatMap((p) => p.hearings)
      .map((h) => h.judge)
      .find((j) => !!j) ?? null;

  // 法院 / 仲裁机构：取第一个 ENGAGED 程序的承办机构
  const firstProc = matter.procedures.find((p) => p.engagement === "ENGAGED");
  const agency = firstProc?.handlingAgency ?? null;
  const caseNumber = firstProc?.caseNumber ?? null;
  const procedureLabel = firstProc
    ? firstProc.customLabel ?? procedureTypeLabel[firstProc.type]
    : null;

  const primaryClientName = matter.primaryClient?.name
    ?? matter.clientLinks.find((cl) => cl.isPrimary)?.client.name
    ?? matter.clientLinks[0]?.client.name
    ?? null;

  const opposingNames = matter.parties
    .filter((p) => p.role === "OPPOSING_PARTY")
    .map((p) => p.name);
  const thirdNames = matter.parties
    .filter((p) => p.role === "THIRD_PARTY")
    .map((p) => p.name);

  const ourStandingLabel = matter.ourStanding
    ? litigationStandingLabel[matter.ourStanding]
    : null;

  return (
    <div className="space-y-4">
      {/* —— 案件信息（dense 两列 label:value 网格）—— */}
      <section className="rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-[13px] font-medium">案件信息</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTeamEditorOpen(true)}
            className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.8} />
            编辑团队
          </Button>
        </header>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 px-4 py-3 text-[12.5px] md:grid-cols-2">
          <Row label="案号">
            <span className="font-mono tabular">{caseNumber ?? matter.internalCode}</span>
          </Row>
          <Row label="案由">{matter.cause?.name ?? matter.causeFreeText ?? "—"}</Row>

          <Row label="类型">{matterCategoryLabel[matter.category]}</Row>
          <Row label="状态">{matterStatusLabel[matter.status]}</Row>

          <Row label="代理程序">{procedureLabel ?? "—"}</Row>
          <Row label="我方诉讼地位">{ourStandingLabel ?? "—"}</Row>

          <Row label="主办律师">
            {lead ? (
              <>
                {lead.user.name}
                <span className="ml-1 text-[11px] text-muted-foreground">
                  {userRoleLabel[lead.user.role]}
                </span>
              </>
            ) : (
              "—"
            )}
          </Row>
          <Row label="协办律师 / 助理">
            {others.length === 0
              ? "—"
              : others.map((m) => `${m.user.name}（${m.role === "CO_LEAD" ? "协办" : "助理"}）`).join("，")}
          </Row>

          <Row label="法院 / 仲裁机构">{agency ?? "—"}</Row>
          <Row label="法官 / 仲裁员">{judge ?? "—"}</Row>

          <Row label="委托人">{primaryClientName ?? "—"}</Row>
          <Row label="对方">
            {opposingNames.length === 0 ? "—" : opposingNames.join("、")}
          </Row>

          <Row label="第三人">{thirdNames.length === 0 ? "—" : thirdNames.join("、")}</Row>
          <Row label="收案日 / 立案日">
            {matter.intakeDate ? formatDate(matter.intakeDate) : "—"}
            <span className="mx-1 text-muted-foreground/40">/</span>
            {matter.firstAcceptedAt ? formatDate(matter.firstAcceptedAt) : "—"}
          </Row>

          <Row label="下次开庭">
            {nextHearing ? (
              <>
                {new Date(nextHearing.startsAt).toLocaleString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
                <span className="ml-1 text-[11px] text-muted-foreground">
                  {nextHearing.procedureLabel}
                </span>
              </>
            ) : (
              "—"
            )}
          </Row>
          <Row label="标的">
            {matter.claimAmount ? (
              <span className="inline-flex items-baseline gap-2">
                <span className="font-mono tabular">¥{Number(matter.claimAmount).toLocaleString()}</span>
                <CourtFeeHint amount={Number(matter.claimAmount)} />
              </span>
            ) : (
              "—"
            )}
          </Row>

          <Row label="收费合计">
            <span className="font-mono tabular text-foreground">
              {formatCurrency(finance.stats.received)}
            </span>
            {finance.stats.receivable > 0 && (
              <span className="ml-2 text-[11px] text-muted-foreground">
                / 应收 <span className="font-mono">{formatCurrency(finance.stats.receivable)}</span>
              </span>
            )}
          </Row>
          <Row label="经办成员">
            <span className="text-foreground">{sortedMembers.length}</span>
            <span className="ml-1 text-[11px] text-muted-foreground">人</span>
          </Row>
        </dl>
      </section>

      {/* —— 参与方（仅在有相对方时显示，否则上面"对方/第三人"已经覆盖）—— */}
      {(opposingNames.length > 0 || thirdNames.length > 0 || matter.clientLinks.length > 1) && (
        <PartiesPanel matter={matter} />
      )}

      {/* —— 近期期限 + 近期开庭（空就完全不渲染）—— */}
      {(upcomingDeadlines.length > 0 || upcomingHearings.length > 0) && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {upcomingDeadlines.length > 0 && (
            <section className="rounded-lg border border-border bg-card">
              <header className="border-b border-border px-4 py-2 text-[13px] font-medium">
                近期期限 <span className="text-[11px] text-muted-foreground">({upcomingDeadlines.length})</span>
              </header>
              <ul className="divide-y divide-border">
                {upcomingDeadlines.map((d) => {
                  const days = Math.ceil(
                    (new Date(d.dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  const isOverdue = days < 0;
                  const isWarn = !isOverdue && days <= 3;
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-1.5 text-[12.5px]">
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{d.title}</div>
                        <div className="text-[10.5px] text-muted-foreground">{d.procedureLabel}</div>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            "font-mono tabular text-[12px]",
                            isOverdue
                              ? "text-destructive"
                              : isWarn
                                ? "text-amber-500"
                                : "text-foreground"
                          )}
                        >
                          {isOverdue ? `逾期 ${-days}d` : days === 0 ? "今天" : `${days}d`}
                        </div>
                        <div className="font-mono text-[10px] tabular text-muted-foreground">
                          {new Date(d.dueAt).toLocaleDateString("zh-CN")}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {upcomingHearings.length > 0 && (
            <section className="rounded-lg border border-border bg-card">
              <header className="border-b border-border px-4 py-2 text-[13px] font-medium">
                近期开庭 <span className="text-[11px] text-muted-foreground">({upcomingHearings.length})</span>
              </header>
              <ul className="divide-y divide-border">
                {upcomingHearings.slice(0, 3).map((h) => (
                  <li key={h.id} className="px-4 py-1.5 text-[12.5px]">
                    <div className="truncate">{h.title}</div>
                    <div className="font-mono text-[10.5px] tabular text-muted-foreground">
                      {new Date(h.startsAt).toLocaleString("zh-CN", {
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                      <span className="ml-2">· {h.procedureLabel}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <TeamEditorDialog
        open={teamEditorOpen}
        onOpenChange={setTeamEditorOpen}
        matterId={matter.id}
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <dt className="w-24 shrink-0 text-[11.5px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-foreground/95">{children}</dd>
    </div>
  );
}

function CourtFeeHint({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  const res = calcCourtFee({ caseType: "PROPERTY", amount });
  return (
    <span className="text-[10.5px] text-muted-foreground">
      诉讼费约 <span className="font-mono">¥{res.fee.toLocaleString()}</span>
      <span className="ml-0.5 text-muted-foreground/60">/ 简易 ¥{res.feeSimplified.toLocaleString()}</span>
    </span>
  );
}
