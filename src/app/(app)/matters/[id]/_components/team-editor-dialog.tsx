"use client";

/**
 * v0.27: 由"编辑团队"扩展为"编辑案件"。
 *
 * - 基本信息：title / 案由 / 标的额 / 我方地位（系统编号 + 收案日期 readonly）
 * - 团队：主办 / 协办 / 助理（沿用 v0.22 实现）
 *
 * 保存时按需触发两个 server action（基本信息 + 团队）。
 */
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { LitigationStanding, MatterCategory, MatterStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  userRoleLabel,
  litigationStandingLabel,
  matterCategoryLabel,
  matterStatusLabel
} from "@/lib/enums";
import {
  standingsByCategory
} from "@/lib/procedures-by-category";
import {
  updateMatterTeam,
  updateMatterBasicInfo
} from "@/server/matters/actions";
import { upsertBillingContractAmount } from "@/server/finance/actions";
import { CauseCombobox } from "@/app/(app)/matters/_components/cause-combobox";

type UserOption = { id: string; name: string; role: string };

type FinanceStats = {
  contractAmount: number;
  receivable: number;
  received: number;
  refund: number;
  cost: number;
  commission: number;
};

type MatterMeta = {
  internalCode: string;
  intakeDate: string | Date | null;
  status: string;
  category: MatterCategory;
  title: string;
  causeId: string | null;
  causeFreeText: string | null;
  claimAmount: number | null;
  ourStanding: LitigationStanding | null;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  matterId: string;
  matterMeta: MatterMeta;
  financeStats: FinanceStats;
  currentOwnerId: string;
  currentMembers: { userId: string; role: "LEAD" | "CO_LEAD" | "ASSISTANT"; name: string }[];
  userOptions: UserOption[];
};

export function TeamEditorDialog({
  open,
  onOpenChange,
  matterId,
  matterMeta,
  financeStats,
  currentOwnerId,
  currentMembers,
  userOptions
}: Props) {
  // 基本信息字段
  const [title, setTitle] = useState(matterMeta.title);
  const [editInternalCode, setEditInternalCode] = useState(matterMeta.internalCode);
  const [editIntakeDate, setEditIntakeDate] = useState(
    matterMeta.intakeDate
      ? (typeof matterMeta.intakeDate === "string"
          ? matterMeta.intakeDate.slice(0, 10)
          : matterMeta.intakeDate.toISOString().slice(0, 10))
      : ""
  );
  const [editCategory, setEditCategory] = useState<MatterCategory>(matterMeta.category);
  const [editStatus, setEditStatus] = useState<string>(matterMeta.status);
  const [causeId, setCauseId] = useState<string>(matterMeta.causeId ?? "");
  const [causeFreeText, setCauseFreeText] = useState(matterMeta.causeFreeText ?? "");
  const [claimAmount, setClaimAmount] = useState<string>(
    matterMeta.claimAmount === null ? "" : String(matterMeta.claimAmount)
  );
  const [ourStanding, setOurStanding] = useState<LitigationStanding | "">(
    matterMeta.ourStanding ?? ""
  );
  const [contractAmount, setContractAmount] = useState("");

  // 团队字段
  const [ownerId, setOwnerId] = useState(currentOwnerId);
  const [coLeads, setCoLeads] = useState<string[]>(
    currentMembers.filter((m) => m.role === "CO_LEAD").map((m) => m.userId)
  );
  const [assistants, setAssistants] = useState<string[]>(
    currentMembers.filter((m) => m.role === "ASSISTANT").map((m) => m.userId)
  );

  const [isPending, startTransition] = useTransition();

  const { contractAmount: caStats } = financeStats;

  useEffect(() => {
    if (open) {
      setTitle(matterMeta.title);
      setEditInternalCode(matterMeta.internalCode);
      setEditIntakeDate(
  matterMeta.intakeDate
    ? (typeof matterMeta.intakeDate === "string"
        ? matterMeta.intakeDate.slice(0, 10)
        : matterMeta.intakeDate.toISOString().slice(0, 10))
    : ""
);
      setEditCategory(matterMeta.category);
      setEditStatus(matterMeta.status);
      setCauseId(matterMeta.causeId ?? "");
      setCauseFreeText(matterMeta.causeFreeText ?? "");
      setClaimAmount(matterMeta.claimAmount === null ? "" : String(matterMeta.claimAmount));
      setOurStanding(matterMeta.ourStanding ?? "");
      setContractAmount(caStats > 0 ? String(caStats) : "");
      setOwnerId(currentOwnerId);
      setCoLeads(currentMembers.filter((m) => m.role === "CO_LEAD").map((m) => m.userId));
      setAssistants(currentMembers.filter((m) => m.role === "ASSISTANT").map((m) => m.userId));
    }
  }, [open, matterMeta, caStats, currentOwnerId, currentMembers]);

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  const availableStandings = standingsByCategory[matterMeta.category];

  // 按案件类型过滤状态选项
  const CIVIL_STATUSES = new Set([
    'PENDING_ACCEPTANCE','IN_PROGRESS','FILING_MATERIALS','FILING_MATERIALS_SIGN',
    'ONLINE_FILING','ONLINE_FILING_REVIEW','FILING_ACCEPTED','FEE_PAYMENT_PENDING',
    'FEE_PAID','HEARING_SCHEDULED','POST_HEARING','POST_JUDGMENT',
    'EXECUTION_MATERIALS','EXECUTION_MATERIALS_SIGN','EXECUTION_ONLINE_FILING',
    'EXECUTION_ONLINE_REVIEW','EXECUTION_PRESERVATION','EXECUTION'
  ]);
  const CRIMINAL_STATUSES = new Set([
    'INVESTIGATION','DETENTION_30','ARREST_REVIEW_7','POST_ARREST_REVIEW',
    'CUSTODY_NECESSITY','BAIL_PENDING','PROSECUTION_REVIEW','TRIAL','CRIMINAL_EXECUTION'
  ]);
  const COMMON_STATUSES = new Set(['ON_HOLD','CLOSED','PENDING_ARCHIVE','ARCHIVED']);

  function statusOptionsForCategory(cat: string): (keyof typeof matterStatusLabel)[] {
    if (cat === 'CRIMINAL' || cat === 'NON_LITIGATION') {
      return [...CRIMINAL_STATUSES, ...COMMON_STATUSES] as (keyof typeof matterStatusLabel)[];
    }
    return [...CIVIL_STATUSES, ...COMMON_STATUSES] as (keyof typeof matterStatusLabel)[];
  }

  function handleSave() {
    startTransition(async () => {
      try {
        // 基本信息：title 必填，其他可空
        if (!title.trim()) {
          toast.error("案件名称不能为空");
          return;
        }
        const parsedAmount = claimAmount.trim() === "" ? null : Number(claimAmount);
        if (parsedAmount !== null && (isNaN(parsedAmount) || parsedAmount < 0)) {
          toast.error("标的额格式有误");
          return;
        }

        // 串行：先基本信息，再团队（避免一个失败时已部分写入）
        await updateMatterBasicInfo({
          id: matterId,
          internalCode: editInternalCode,
          intakeDate: editIntakeDate ? new Date(editIntakeDate) : null,
          status: editStatus as MatterStatus,
          category: editCategory,
          title,
          causeId: causeId || "",
          causeFreeText: causeFreeText || "",
          claimAmount: parsedAmount,
          ourStanding: ourStanding || null
        });

        await updateMatterTeam({
          matterId,
          ownerId,
          coLeadIds: coLeads,
          assistantIds: assistants
        });

        // 财务：合同额（仅修改，不自动生成收付记录）
        const ca = parseFloat(contractAmount);
        if (ca > 0) {
          await upsertBillingContractAmount(matterId, ca);
        }

        toast.success("案件信息已更新");
        onOpenChange(false);
      } catch (err) {
        toast.error("更新失败", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑案件</DialogTitle>
          <DialogDescription className="text-xs">
            所有字段由当前主办律师维护。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 系统信息 */}
          <section className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">系统编号</Label>
              <Input
                value={editInternalCode}
                onChange={(e) => setEditInternalCode(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">收案日期</Label>
              <Input
                type="date"
                value={editIntakeDate}
                onChange={(e) => setEditIntakeDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">状态</Label>
              <Select
                value={editStatus}
                onValueChange={setEditStatus}
              >
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptionsForCategory(editCategory).map((s) => (
                    <SelectItem key={s} value={s}>
                      {matterStatusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">类别</Label>
              <Select
                value={editCategory}
                onValueChange={(v) => setEditCategory(v as MatterCategory)}
              >
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["CIVIL_COMMERCIAL","LABOR_ARBITRATION","COMMERCIAL_ARBITRATION","CRIMINAL","ADMINISTRATIVE","NON_LITIGATION","LEGAL_COUNSEL","SPECIAL_PROJECT","AGENT_FILING","CONSULTATION","PUBLIC_SOURCE"] as MatterCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {matterCategoryLabel[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* 基本信息 */}
          <section className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground">基本信息</h3>

            <div className="space-y-1.5">
              <Label className="text-xs">案件名称</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="案件名称（保存时自动去除空格）"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">案由</Label>
                <CauseCombobox
                  category={matterMeta.category}
                  value={causeId}
                  onChange={(id) => setCauseId(id)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">自由文本案由（不在标准库时填）</Label>
                <Input
                  value={causeFreeText}
                  onChange={(e) => setCauseFreeText(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">标的额（元）</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  placeholder="非金钱标的留空"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">我方诉讼地位</Label>
                <Select
                  value={ourStanding || ""}
                  onValueChange={(v) => setOurStanding(v as LitigationStanding | "")}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="选择地位" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStandings.map((s) => (
                      <SelectItem key={s} value={s}>
                        {litigationStandingLabel[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <h3 className="text-xs font-medium text-muted-foreground mb-3">财务</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">合同额（元）</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={contractAmount}
                    onChange={(e) => setContractAmount(e.target.value)}
                    placeholder="0"
                    className="font-mono h-9"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 团队（已隐藏，保留结构） */}
          <section className="hidden space-y-3 border-t border-border pt-4">
            <h3 className="text-xs font-medium text-muted-foreground">承办团队</h3>

            <div className="space-y-1.5">
              <Label className="text-xs">主办律师</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {userRoleLabel[u.role as keyof typeof userRoleLabel] ?? u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">协办律师（可多选）</Label>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-2">
                {userOptions
                  .filter((u) => u.id !== ownerId)
                  .map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-popover"
                    >
                      <Checkbox
                        checked={coLeads.includes(u.id)}
                        onCheckedChange={() => toggle(coLeads, setCoLeads, u.id)}
                      />
                      <span>{u.name}</span>
                    </label>
                  ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">助理（可多选）</Label>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-2">
                {userOptions
                  .filter((u) => u.id !== ownerId && !coLeads.includes(u.id))
                  .map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-popover"
                    >
                      <Checkbox
                        checked={assistants.includes(u.id)}
                        onCheckedChange={() => toggle(assistants, setAssistants, u.id)}
                      />
                      <span>{u.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
