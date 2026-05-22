"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Search,
  ExternalLink,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import type { ConflictSeverity, ConflictConclusion } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { runCheckAndSave, setConflictConclusion } from "@/server/conflicts/actions";
import { cn } from "@/lib/utils";

type Hit = {
  id: string;
  hitType: string;
  targetType: string;
  targetId: string;
  matchedName: string;
  matchedField: string;
  matchedValue: string;
  matchedRatio: number | null;
  severity: ConflictSeverity;
  reason: string;
};

type LatestCheck = {
  id: string;
  conclusion: ConflictConclusion;
  hits: Hit[];
  decidedBy: { id: string; name: string } | null;
  decidedAt: Date | null;
  note: string | null;
  checkedAt: Date;
};

type Props = {
  intakeId: string;
  intakeClientName?: string;
  intakeClientIdNumber?: string;
  opposingParties: { name: string; idNumber?: string }[];
  thirdParties: { name: string; idNumber?: string }[];
  latestCheck: LatestCheck | null;
  canEditConclusion: boolean;
};

const severityStyle: Record<ConflictSeverity, { color: string; bg: string; label: string }> = {
  BLOCKING: { color: "#F87171", bg: "rgba(248,113,113,0.12)", label: "阻塞" },
  HIGH: { color: "#FB923C", bg: "rgba(251,146,60,0.12)", label: "高" },
  MEDIUM: { color: "#FBBF24", bg: "rgba(251,191,36,0.12)", label: "中" },
  LOW: { color: "#4ADE80", bg: "rgba(74,222,128,0.12)", label: "低" }
};

const conclusionLabel: Record<ConflictConclusion, string> = {
  PENDING: "待结论",
  SAME_SUBJECT: "确认同一主体",
  DIFFERENT: "不同主体",
  NEED_INFO: "信息不足"
};

export function ConflictSection({
  intakeId,
  intakeClientName,
  intakeClientIdNumber,
  opposingParties,
  thirdParties,
  latestCheck,
  canEditConclusion
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [conclusionNote, setConclusionNote] = useState(latestCheck?.note ?? "");

  function handleRunCheck() {
    const queries: { role: "CLIENT_PARTY" | "OPPOSING_PARTY" | "THIRD_PARTY"; name: string; idNumber?: string }[] = [];
    if (intakeClientName) {
      queries.push({
        role: "CLIENT_PARTY",
        name: intakeClientName,
        idNumber: intakeClientIdNumber
      });
    }
    for (const p of opposingParties) {
      queries.push({ role: "OPPOSING_PARTY", name: p.name, idNumber: p.idNumber });
    }
    for (const p of thirdParties) {
      queries.push({ role: "THIRD_PARTY", name: p.name, idNumber: p.idNumber });
    }
    if (queries.length === 0) {
      toast.warning("没有可检索的当事人", { description: "请先在收案中添加委托方或对方" });
      return;
    }

    startTransition(async () => {
      try {
        const res = await runCheckAndSave({ intakeId, queries });
        toast.success(`冲突检索完成`, {
          description: `共命中 ${res.hits.length} 条`
        });
      } catch (err) {
        toast.error("检索失败", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function handleSetConclusion(conclusion: ConflictConclusion) {
    if (!latestCheck) return;
    startTransition(async () => {
      try {
        await setConflictConclusion({
          checkId: latestCheck.id,
          conclusion,
          note: conclusionNote
        });
        toast.success("结论已保存");
      } catch (err) {
        toast.error("保存失败", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card/40 p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            冲突检索
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            姓名 / 身份证 / 信用代码 匹配历史客户与历史案件当事人
          </p>
        </div>

        <Button
          onClick={handleRunCheck}
          disabled={isPending}
          size="sm"
          className="gap-1.5"
          variant={latestCheck ? "outline" : "default"}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {latestCheck ? "重新检索" : "运行冲突检索"}
        </Button>
      </header>

      {!latestCheck ? (
        <div className="rounded-md border border-dashed border-border bg-background/30 py-8 text-center text-sm text-muted-foreground">
          还未运行冲突检索
        </div>
      ) : (
        <div className="space-y-4">
          {/* 概览 */}
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background/40 p-3 text-xs">
            <span className="text-muted-foreground">
              {new Date(latestCheck.checkedAt).toLocaleString("zh-CN")}
            </span>
            <span className="text-muted-foreground">·</span>
            <span>
              <span className="font-mono tabular text-foreground">{latestCheck.hits.length}</span>{" "}
              条命中
            </span>
            <span className="text-muted-foreground">·</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                latestCheck.conclusion === "SAME_SUBJECT" && "border-destructive/40 text-destructive",
                latestCheck.conclusion === "DIFFERENT" && "border-[#4ADE80]/40 text-[#4ADE80]",
                latestCheck.conclusion === "NEED_INFO" && "border-[#FBBF24]/40 text-[#FBBF24]"
              )}
            >
              {conclusionLabel[latestCheck.conclusion]}
            </Badge>
            {latestCheck.decidedBy && (
              <span className="text-muted-foreground">
                由 {latestCheck.decidedBy.name} 于{" "}
                {latestCheck.decidedAt
                  ? new Date(latestCheck.decidedAt).toLocaleDateString("zh-CN")
                  : ""}
                标记
              </span>
            )}
          </div>

          {/* 命中列表 */}
          {latestCheck.hits.length === 0 ? (
            <div className="rounded-md border border-[#4ADE80]/30 bg-[#4ADE80]/10 p-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#4ADE80]" />
                <span className="text-foreground">未命中任何历史客户或案件</span>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {latestCheck.hits.map((h) => {
                const style = severityStyle[h.severity];
                const targetHref =
                  h.targetType === "Matter"
                    ? `/matters/${h.targetId}`
                    : h.targetType === "Client"
                      ? `/clients/${h.targetId}`
                      : null;
                return (
                  <li
                    key={h.id}
                    className="rounded-md border p-3"
                    style={{
                      borderColor: `${style.color}40`,
                      backgroundColor: style.bg
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            className="h-3.5 w-3.5"
                            style={{ color: style.color }}
                          />
                          <span
                            className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: style.color }}
                          >
                            {style.label}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {h.hitType === "HISTORICAL_CLIENT" ? "历史客户" : "历史案件"}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm">{h.reason}</p>
                        <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                          匹配字段：{h.matchedField} = {h.matchedValue}
                          {h.matchedRatio !== null && h.matchedRatio < 1 && (
                            <span className="ml-2">
                              相似度 {(h.matchedRatio * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {targetHref && (
                        <Link
                          href={targetHref}
                          className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                        >
                          查看
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* 结论 */}
          {canEditConclusion && (
            <div className="rounded-md border border-border bg-background/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-sm font-medium">标记结论</h3>
              </div>
              <Textarea
                value={conclusionNote}
                onChange={(e) => setConclusionNote(e.target.value)}
                placeholder="补充说明（如：经核对身份证号确认非同一主体）"
                rows={2}
                className="mb-3 text-xs"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetConclusion("SAME_SUBJECT")}
                  disabled={isPending}
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                >
                  确认同一主体（有冲突）
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetConclusion("DIFFERENT")}
                  disabled={isPending}
                  className="border-[#4ADE80]/40 text-[#4ADE80] hover:bg-[#4ADE80]/10"
                >
                  不同主体（无冲突）
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetConclusion("NEED_INFO")}
                  disabled={isPending}
                >
                  信息不足，待补充
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
