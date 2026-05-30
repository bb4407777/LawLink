"use client";

import { useState, useTransition, useRef, useMemo, useEffect } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  Paperclip,
  FileText,
  X,
  CalendarDays,
  ScanLine,
  Sparkles
} from "lucide-react";
import type {
  MatterCategory,
  ProcedureType,
  LitigationStanding,
  FeeType,
  PartyRole,
  UserRole
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  matterCategoryLabel,
  procedureTypeLabel,
  litigationStandingLabel,
  feeTypeLabel,
  procedureToStandingOptions,
  userRoleLabel
} from "@/lib/enums";
import {
  proceduresByCategory,
  suggestHandlingAgency
} from "@/lib/procedures-by-category";
import { intakeCreateSchema, type IntakeCreateInput } from "@/server/intakes/schemas";
import { createIntake } from "@/server/intakes/actions";
import { uploadDocument } from "@/server/documents/actions";
import { parsePleading } from "@/server/ai/parse-pleading";
import { PartyCard, PARTY_GRID } from "@/app/(app)/matters/_components/party-card";
import {
  recommendCause,
  type CauseRecommendation
} from "@/server/ai/recommend-cause";
import { getEnterpriseDetail, type EnterpriseSearchItem } from "@/server/yuandian/enterprise";
import { cn } from "@/lib/utils";
import { CauseCombobox } from "@/app/(app)/matters/_components/cause-combobox";
import { CauseAiManualDialog } from "@/app/(app)/matters/_components/cause-ai-manual-dialog";
import type { ClientOption } from "@/app/(app)/matters/_components/matters-view";
import { ClientCombobox } from "./client-combobox";
import { CauseRecommendationDialog } from "./cause-recommendation-dialog";

const CATEGORIES: MatterCategory[] = [
  "CIVIL_COMMERCIAL",
  "CRIMINAL",
  "ADMINISTRATIVE",
  "NON_LITIGATION",
  "LEGAL_COUNSEL",
  "SPECIAL_PROJECT"
];

const FEE_TYPES: FeeType[] = ["FIXED", "CONTINGENCY", "TIMED"];

// 我方为被动方时，可上传起诉状/申请书 OCR 识别对方
const RECEIVING_STANDINGS = new Set<LitigationStanding>([
  "DEFENDANT",
  "THIRD_PARTY",
  "COUNTERCLAIM_DEFENDANT",
  "APPELLEE",
  "RETRIAL_RESPONDENT",
  "EXECUTED_PERSON",
  "ARBITRATION_RESPONDENT",
  "ADMIN_DEFENDANT",
  "ADMIN_RECONSIDERATION_RESPONDENT",
  "CRIMINAL_DEFENDANT"
]);

const defaults: IntakeCreateInput = {
  title: "",
  category: "CIVIL_COMMERCIAL",
  causeId: "",
  causeFreeText: "",
  description: "",
  receivedAt: new Date(),
  firstProcedureType: undefined,
  firstAgency: "",
  ourStanding: undefined,
  claimAmount: undefined,
  claimDescription: "",
  clientId: "",
  clientName: "",
  clientType: "INDIVIDUAL",
  contactName: "",
  contactPhone: "",
  feeType: undefined,
  feeAmount: undefined,
  contingencyTerms: "",
  feeSchedule: "",
  feeNote: "",
  ownerUserId: "",
  coUserIds: [],
  parties: [
    {
      role: "CLIENT_PARTY",
      standing: undefined,
      ordinal: 1,
      partyType: "NATURAL_PERSON",
      name: "",
      idNumber: "",
      enterpriseSocialCode: "",
      enterpriseName: "",
      phone: "",
      address: "",
      legalRep: "",
      contactName: "",
      notes: ""
    },
    {
      role: "OPPOSING_PARTY",
      standing: undefined,
      ordinal: 1,
      partyType: "NATURAL_PERSON",
      name: "",
      idNumber: "",
      enterpriseSocialCode: "",
      enterpriseName: "",
      phone: "",
      address: "",
      legalRep: "",
      contactName: "",
      notes: ""
    }
  ]
};

type Colleague = { id: string; name: string; role: UserRole };

export function IntakeSheet({
  open,
  onOpenChange,
  clientOptions,
  colleagues
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientOptions: ClientOption[];
  colleagues: Colleague[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [contracts, setContracts] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pleadingRef = useRef<HTMLInputElement>(null);
  const [ocrPending, setOcrPending] = useState(false);
  const [aiRecOpen, setAiRecOpen] = useState(false);
  const [aiRecLoading, setAiRecLoading] = useState(false);
  const [aiRecCandidates, setAiRecCandidates] = useState<CauseRecommendation[]>([]);
  const [aiRecError, setAiRecError] = useState<string | null>(null);
  const [aiRecSituation, setAiRecSituation] = useState<{
    category: MatterCategory;
    text: string;
  } | null>(null);
  const [aiManualOpen, setAiManualOpen] = useState(false);

  const methods = useForm<IntakeCreateInput>({
    resolver: zodResolver(intakeCreateSchema),
    defaultValues: { ...defaults, ownerUserId: session?.user?.id ?? "" }
  });
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = methods;

  const { fields: parties, append: appendParty, remove: removeParty } = useFieldArray({
    control,
    name: "parties"
  });

  const category = watch("category");
  const firstProcedureType = watch("firstProcedureType");
  const clientId = watch("clientId") ?? "";
  const feeType = watch("feeType");
  const ownerUserId = watch("ownerUserId");
  const coUserIds = watch("coUserIds");
  const receivedAt = watch("receivedAt");

  // 标题自动生成：填完当事人 + 案由后按「委托方 与 对方 案由」生成，用户手改后不再覆盖
  const [titleTouched, setTitleTouched] = useState(false);
  const [causeName, setCauseName] = useState("");
  const watchedParties = watch("parties");
  const watchedTitle = watch("title");
  const watchedCauseFree = watch("causeFreeText");
  useEffect(() => {
    if (titleTouched) return;
    const list = (watchedParties ?? []) as { role?: string; name?: string }[];
    const clientNm = list.find((p) => p.role === "CLIENT_PARTY")?.name?.trim();
    const oppNm = list.find((p) => p.role === "OPPOSING_PARTY")?.name?.trim();
    const causeNm = (causeName || watchedCauseFree || "").trim();
    if (!clientNm && !oppNm) return;
    // 案件名称不含空格（产品要求）
    const suggested = `${clientNm ?? ""}${oppNm ? `与${oppNm}` : ""}${causeNm}`.replace(/\s+/g, "");
    if (suggested && suggested !== (watchedTitle ?? "")) {
      setValue("title", suggested, { shouldDirty: true });
    }
  }, [watchedParties, causeName, watchedCauseFree, titleTouched, watchedTitle, setValue]);

  // 当前类别下可选程序
  const procedureOptions: ProcedureType[] = useMemo(
    () => proceduresByCategory[category] ?? [],
    [category]
  );

  // 当前程序下可选诉讼地位
  const ourStandingOptions: LitigationStanding[] = useMemo(
    () => procedureToStandingOptions(firstProcedureType, "ours"),
    [firstProcedureType]
  );

  // 切类别时如果当前程序不在新类别列表里，清掉
  useEffect(() => {
    if (firstProcedureType && !procedureOptions.includes(firstProcedureType)) {
      setValue("firstProcedureType", undefined);
      setValue("ourStanding", undefined);
    }
  }, [category, firstProcedureType, procedureOptions, setValue]);

  // 设默认 owner
  useEffect(() => {
    if (!ownerUserId && session?.user?.id) {
      setValue("ownerUserId", session.user.id);
    }
  }, [ownerUserId, session, setValue]);

  // 切程序时自动填充建议机构（仅在为空时）
  function handleProcedureChange(p: ProcedureType) {
    setValue("firstProcedureType", p, { shouldDirty: true });
    setValue("ourStanding", undefined);
    const currentAgency = watch("firstAgency");
    if (!currentAgency || currentAgency.length === 0) {
      setValue("firstAgency", suggestHandlingAgency(p));
    }
  }

  async function performSubmit(values: IntakeCreateInput) {
    try {
      const res = await createIntake(values);
      if (contracts.length > 0 && res.id) {
        for (const file of contracts) {
          const fd = new FormData();
          fd.set("intakeId", res.id);
          fd.set("name", file.name);
          fd.set("category", "CONTRACT");
          fd.set("encrypted", "true");
          fd.set("file", file);
          await uploadDocument(fd);
        }
      }
      toast.success(
        contracts.length > 0
          ? `收案已提交审批，上传 ${contracts.length} 份合同`
          : "收案已提交审批"
      );
      reset({ ...defaults, ownerUserId: session?.user?.id ?? "" });
      setTitleTouched(false);
      setCauseName("");
      setContracts([]);
      onOpenChange(false);
      if (res.id) router.push(`/intakes/${res.id}`);
    } catch (err) {
      toast.error("创建失败", {
        description: err instanceof Error ? err.message : ""
      });
    }
  }

  function onSubmit(values: IntakeCreateInput) {
    // 委托方恒为 parties[0]（role=CLIENT_PARTY）：拆回顶层 client* 字段，其余进 parties。
    // 名称 + 证件号必填由 zodResolver(partyInputSchema) 对每行统一校验。
    const all = values.parties ?? [];
    const client = all.find((p) => p.role === "CLIENT_PARTY");
    if (!client || !client.name?.trim()) {
      toast.warning("请填写客户", { description: "客户名称为必填" });
      return;
    }
    const isOrg = client.partyType === "ORGANIZATION";
    const payload: IntakeCreateInput = {
      ...values,
      clientName: client.name.trim(),
      clientType: isOrg ? "COMPANY" : "INDIVIDUAL",
      clientIdNumber: (isOrg ? client.enterpriseSocialCode : client.idNumber) ?? "",
      clientAddress: client.address ?? "",
      clientLegalRep: client.legalRep ?? "",
      contactName: client.contactName ?? "",
      contactPhone: client.phone ?? "",
      parties: all.filter((p) => p.role !== "CLIENT_PARTY")
    };
    startTransition(() => performSubmit(payload));
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.size <= 20 * 1024 * 1024);
    if (arr.length < list.length) toast.warning("跳过了超过 20MB 的文件");
    setContracts((prev) => [...prev, ...arr]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePleadingFile(file: File) {
    setOcrPending(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await parsePleading(fd);
      let added = 0;
      for (const p of res.plaintiffs) {
        // OCR 时按 idNumber 长度/legalRep 是否存在猜主体类型：18 位含字母通常是社会信用代码 → 公司
        const guessed: "NATURAL_PERSON" | "ORGANIZATION" =
          (p.legalRep && p.legalRep.trim()) || (p.idNumber && p.idNumber.length === 18 && /[A-Z]/.test(p.idNumber))
            ? "ORGANIZATION"
            : "NATURAL_PERSON";
        appendParty({
          role: "OPPOSING_PARTY",
          standing: undefined,
          ordinal: parties.filter((x) => x.role === "OPPOSING_PARTY").length + 1 + added,
          partyType: guessed,
          name: p.name ?? "",
          idNumber: guessed === "NATURAL_PERSON" ? p.idNumber ?? "" : "",
          enterpriseSocialCode: guessed === "ORGANIZATION" ? p.idNumber ?? "" : "",
          enterpriseName: guessed === "ORGANIZATION" ? p.name ?? "" : "",
          phone: p.phone ?? "",
          address: p.address ?? "",
          legalRep: p.legalRep ?? "",
          contactName: "",
          notes: ""
        });
        added++;
      }
      let thirdAdded = 0;
      for (const tp of res.thirdParties) {
        const guessed: "NATURAL_PERSON" | "ORGANIZATION" =
          (tp.legalRep && tp.legalRep.trim()) || (tp.idNumber && tp.idNumber.length === 18 && /[A-Z]/.test(tp.idNumber))
            ? "ORGANIZATION"
            : "NATURAL_PERSON";
        appendParty({
          role: "THIRD_PARTY",
          standing: undefined,
          ordinal: parties.filter((x) => x.role === "THIRD_PARTY").length + 1 + thirdAdded,
          partyType: guessed,
          name: tp.name ?? "",
          idNumber: guessed === "NATURAL_PERSON" ? tp.idNumber ?? "" : "",
          enterpriseSocialCode: guessed === "ORGANIZATION" ? tp.idNumber ?? "" : "",
          enterpriseName: guessed === "ORGANIZATION" ? tp.name ?? "" : "",
          phone: tp.phone ?? "",
          address: tp.address ?? "",
          legalRep: tp.legalRep ?? "",
          contactName: "",
          notes: ""
        });
        thirdAdded++;
      }
      if (res.cause && !watch("causeFreeText")) {
        setValue("causeFreeText", res.cause, { shouldDirty: true });
      }
      if (typeof res.claimAmount === "number" && !watch("claimAmount")) {
        setValue("claimAmount", res.claimAmount, { shouldDirty: true });
      }
      if (res.claimDescription && !watch("claimDescription")) {
        setValue("claimDescription", res.claimDescription, { shouldDirty: true });
      }
      if (res.court && !watch("firstAgency")) {
        setValue("firstAgency", res.court, { shouldDirty: true });
      }
      toast.success(
        `已识别 ${res.plaintiffs.length} 个起诉方 / ${res.thirdParties.length} 个第三人`,
        { description: "请人工核对字段是否准确" }
      );

      // OCR 后联动 AI 案由推荐（仅当 OCR 抽到 cause / claimDescription 时触发）
      const situationParts: string[] = [];
      if (res.cause) situationParts.push(`OCR 识别案由：${res.cause}`);
      if (res.claimDescription) situationParts.push(`诉讼请求：${res.claimDescription}`);
      const oppPartyNames = res.plaintiffs.map((p) => p.name).filter(Boolean).join("、");
      if (oppPartyNames) situationParts.push(`对方当事人：${oppPartyNames}`);
      if (res.court) situationParts.push(`管辖：${res.court}`);
      const situationText = situationParts.join("\n");
      if (situationText && !watch("causeId")) {
        triggerCauseRecommendation(category, situationText);
      }
    } catch (err) {
      toast.error("识别失败", {
        description: err instanceof Error ? err.message : ""
      });
    } finally {
      setOcrPending(false);
      if (pleadingRef.current) pleadingRef.current.value = "";
    }
  }

  async function triggerCauseRecommendation(
    cat: MatterCategory,
    situation: string
  ) {
    setAiRecSituation({ category: cat, text: situation });
    setAiRecOpen(true);
    setAiRecLoading(true);
    setAiRecError(null);
    setAiRecCandidates([]);
    try {
      const list = await recommendCause({ category: cat, situation });
      setAiRecCandidates(list);
    } catch (err) {
      setAiRecError(err instanceof Error ? err.message : "AI 推荐失败");
    } finally {
      setAiRecLoading(false);
    }
  }

  function handleAiRecSelect(causeId: string, causeNm: string) {
    setValue("causeId", causeId, { shouldDirty: true });
    setCauseName(causeNm);
    setAiRecOpen(false);
    toast.success("已选用 AI 推荐案由", { description: causeNm });
  }

  function handleAiRecRetry() {
    if (aiRecSituation) {
      triggerCauseRecommendation(aiRecSituation.category, aiRecSituation.text);
    }
  }

  function toggleCo(uid: string) {
    const next = coUserIds.includes(uid)
      ? coUserIds.filter((id) => id !== uid)
      : [...coUserIds, uid];
    setValue("coUserIds", next, { shouldDirty: true });
  }

  async function handlePickYuandian(candidate: EnterpriseSearchItem) {
    // 委托方行恒为 parties[0]
    setValue("clientId", "", { shouldDirty: true });
    setValue("parties.0.partyType", "ORGANIZATION", { shouldDirty: true });
    setValue("parties.0.name", candidate.name, { shouldDirty: true });
    setValue("parties.0.enterpriseName", candidate.name, { shouldDirty: true });
    setValue("parties.0.enterpriseSocialCode", candidate.creditCode, {
      shouldDirty: true,
      shouldValidate: true
    });

    const tid = toast.loading("正在获取企业详细信息…", { duration: 10_000 });
    try {
      const res = await getEnterpriseDetail(candidate.id);
      if (res.info) {
        setValue("parties.0.address", res.info.address, { shouldDirty: true });
        setValue("parties.0.legalRep", res.info.legalRep, { shouldDirty: true });
        if (res.info.legalRep && !watch("parties.0.contactName")) {
          setValue("parties.0.contactName", res.info.legalRep, { shouldDirty: true });
        }
        toast.success(
          res.info.legalRep
            ? `已填充：法定代表人 ${res.info.legalRep}`
            : "已填充企业信息",
          { id: tid }
        );
      } else {
        toast.info("未查到详细信息，已填充基础信息", { id: tid });
      }
    } catch {
      toast.error("获取企业详情失败，请手动补充", { id: tid });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle>新建收案</DialogTitle>
          <DialogDescription className="text-xs">
            提交后进入&ldquo;待审批&rdquo;，由管理员/主任律师确认后转为正式案件
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {/* 1. 基本案情：类别/案由 + 程序/地位/机构 + 标的 + 经办 + 案件名称 合并 */}
            <Section title="① 基本案情" required>
              {/* 案件类别 + 案由（左半）| 案件名称（右半）*/}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <Field label="案件类别" required>
                  <Select
                    value={category}
                    onValueChange={(v) => setValue("category", v as MatterCategory)}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {matterCategoryLabel[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="案由">
                  <div className="flex items-stretch gap-1.5">
                    <div className="flex-1">
                      <CauseCombobox
                        category={category}
                        value={watch("causeId") || ""}
                        onChange={(id, name) => {
                          setValue("causeId", id, { shouldDirty: true });
                          setCauseName(name);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiManualOpen(true)}
                      className="shrink-0 rounded-md border border-border bg-background px-2.5 text-violet-600 hover:border-violet-400 hover:bg-violet-50"
                      title="AI 推荐案由（手动输入案情）"
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                  </div>
                </Field>
                <Field
                  label="案件名称"
                  className="sm:col-span-2"
                  hint="已按「客户与相对方案由」自动生成，可手动修改"
                  error={errors.title?.message}
                >
                  {(() => {
                    const titleReg = register("title");
                    return (
                      <Input
                        placeholder="可留空 · 例：某建设工程合同纠纷"
                        {...titleReg}
                        onChange={(e) => {
                          titleReg.onChange(e);
                          setTitleTouched(true);
                        }}
                      />
                    );
                  })()}
                </Field>
              </div>

              {/* 当前程序 | 收案时间 | 争议解决机构 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="当前程序" required error={errors.firstProcedureType?.message}>
                  <Select
                    value={firstProcedureType ?? ""}
                    onValueChange={(v) => handleProcedureChange(v as ProcedureType)}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="选择当前程序" />
                    </SelectTrigger>
                    <SelectContent>
                      {procedureOptions.map((p) => (
                        <SelectItem key={p} value={p}>
                          {procedureTypeLabel[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="收案时间">
                  <div className="relative">
                    <Input
                      type="date"
                      value={
                        receivedAt ? new Date(receivedAt).toISOString().split("T")[0] : ""
                      }
                      onChange={(e) =>
                        setValue("receivedAt", new Date(e.target.value), { shouldDirty: true })
                      }
                    />
                    <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </Field>

                <Field label="争议解决机构 / 办理机关">
                  <Input
                    placeholder="如：浦东法院 / 上海仲裁委"
                    {...register("firstAgency")}
                  />
                </Field>
              </div>

              {/* 标的额 | 标的描述 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="标的额（元）">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0.00"
                    className="font-mono"
                    {...register("claimAmount", { valueAsNumber: true })}
                  />
                </Field>
                <Field label="标的描述（非金钱标的或其他诉求）">
                  <Input
                    placeholder="如：请求确认合同有效 / 请求停止侵害"
                    {...register("claimDescription")}
                  />
                </Field>
              </div>

              {/* 主办律师 | 协办律师 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="主办律师" required>
                  <Select
                    value={ownerUserId ?? ""}
                    onValueChange={(v) => setValue("ownerUserId", v, { shouldDirty: true })}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="选择主办律师" />
                    </SelectTrigger>
                    <SelectContent>
                      {colleagues.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} · {userRoleLabel[u.role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="协办律师（可多选，事后可改）">
                  <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background p-3 max-h-44 overflow-y-auto">
                    {colleagues
                      .filter((u) => u.id !== ownerUserId)
                      .map((u) => (
                        <label
                          key={u.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-popover"
                        >
                          <Checkbox
                            checked={coUserIds.includes(u.id)}
                            onCheckedChange={() => toggleCo(u.id)}
                          />
                          <span>{u.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {userRoleLabel[u.role]}
                          </span>
                        </label>
                      ))}
                  </div>
                </Field>
              </div>

            </Section>

            {/* 2. 案件当事人（委托方 + 对方 + 第三人 合并） */}
            <Section
              title="② 案件当事人"
              required
              headerAction={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1"
                  onClick={() =>
                    appendParty({
                      role: "OPPOSING_PARTY",
                      standing: undefined,
                      ordinal: parties.length + 1,
                      partyType: "NATURAL_PERSON",
                      name: "",
                      idNumber: "",
                      enterpriseSocialCode: "",
                      enterpriseName: "",
                      phone: "",
                      address: "",
                      legalRep: "",
                      contactName: "",
                      notes: ""
                    })
                  }
                >
                  <Plus className="h-3 w-3" />
                  添加当事人
                </Button>
              }
            >
              {watch("ourStanding") && RECEIVING_STANDINGS.has(watch("ourStanding")!) && (
                <div className="rounded-md border border-dashed border-primary/40 bg-primary/[0.03] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">
                        <ScanLine className="mr-1 inline h-3 w-3 text-primary" />
                        识别起诉状 / 申请书
                      </div>
                      <p className="mt-0.5">
                        我方为被动方，可上传相对方起诉状 / 申请书（JPG / PNG / WebP / PDF，≤ 20MB），AI 自动抽取相对方主体与诉求
                      </p>
                    </div>
                    <input
                      ref={pleadingRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePleadingFile(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => pleadingRef.current?.click()}
                      disabled={ocrPending}
                      className="h-7 shrink-0 gap-1"
                    >
                      {ocrPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ScanLine className="h-3 w-3" />
                      )}
                      上传识别
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                客户必填；相对方 / 第三人用于利益冲突检索，所有当事人均需填写名称与证件号 / 信用代码。
              </p>
              <div className="overflow-x-auto">
                <div className="min-w-[700px] space-y-1.5">
                  {/* 表头 */}
                  <div
                    className={cn(
                      PARTY_GRID,
                      "px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                    )}
                  >
                    <span>角色</span>
                    <span>类型</span>
                    <span>姓名 / 名称</span>
                    <span>诉讼地位</span>
                    <span>证件号 / 信用代码</span>
                    <span className="text-right">操作</span>
                  </div>

                  {parties.map((p, idx) => {
                    const all = (watch("parties") ?? []) as { role?: string }[];
                    const role = (all[idx]?.role as PartyRole) ?? "OPPOSING_PARTY";
                    const isClient = role === "CLIENT_PARTY";
                    const ourStanding = watch("ourStanding");
                    return (
                      <PartyCard
                        key={p.id}
                        index={idx}
                        fieldPrefix="parties"
                        removable={!isClient}
                        onRemove={() => removeParty(idx)}
                        errors={errors as never}
                        roleSlot={
                          isClient ? (
                            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                              客户
                            </span>
                          ) : (
                            <Select
                              value={role}
                              onValueChange={(v) =>
                                setValue(`parties.${idx}.role`, v as PartyRole, {
                                  shouldDirty: true
                                })
                              }
                            >
                              <SelectTrigger className="h-8 w-full bg-background px-2 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OPPOSING_PARTY" className="text-xs">
                                  相对方
                                </SelectItem>
                                <SelectItem value="THIRD_PARTY" className="text-xs">
                                  第三人
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )
                        }
                        standingSlot={
                          isClient ? (
                            <Select
                              value={ourStanding ?? ""}
                              onValueChange={(v) =>
                                setValue("ourStanding", v as LitigationStanding, {
                                  shouldDirty: true
                                })
                              }
                            >
                              <SelectTrigger className="h-8 w-full bg-background px-2 text-xs">
                                <SelectValue placeholder="诉讼地位（可选）" />
                              </SelectTrigger>
                              <SelectContent>
                                {(ourStandingOptions.length
                                  ? ourStandingOptions
                                  : (Object.keys(litigationStandingLabel) as LitigationStanding[])
                                ).map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs">
                                    {litigationStandingLabel[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select
                              value={watch(`parties.${idx}.standing`) ?? ""}
                              onValueChange={(v) =>
                                setValue(`parties.${idx}.standing`, v as LitigationStanding, {
                                  shouldDirty: true
                                })
                              }
                            >
                              <SelectTrigger className="h-8 w-full bg-background px-2 text-xs">
                                <SelectValue placeholder="诉讼地位" />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(litigationStandingLabel) as LitigationStanding[]).map(
                                  (s) => (
                                    <SelectItem key={s} value={s} className="text-xs">
                                      {litigationStandingLabel[s]}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          )
                        }
                        nameSlot={
                          isClient ? (
                            <ClientCombobox
                              triggerClassName="h-8 text-sm"
                              clientId={clientId}
                              clientName={watch("parties.0.name") ?? ""}
                              clientType={
                                watch("parties.0.partyType") === "ORGANIZATION"
                                  ? "COMPANY"
                                  : "INDIVIDUAL"
                              }
                              options={clientOptions}
                              onPickExisting={(id, name) => {
                                setValue("clientId", id, { shouldDirty: true });
                                setValue("parties.0.name", name, {
                                  shouldDirty: true,
                                  shouldValidate: true
                                });
                              }}
                              onTypeNew={(name) => {
                                setValue("clientId", "", { shouldDirty: true });
                                setValue("parties.0.name", name, {
                                  shouldDirty: true,
                                  shouldValidate: true
                                });
                              }}
                              onPickYuandian={handlePickYuandian}
                              onClear={() => {
                                setValue("clientId", "", { shouldDirty: true });
                                setValue("parties.0.name", "", { shouldDirty: true });
                                setValue("parties.0.idNumber", "", { shouldDirty: true });
                                setValue("parties.0.enterpriseSocialCode", "", { shouldDirty: true });
                                setValue("parties.0.enterpriseName", "", { shouldDirty: true });
                                setValue("parties.0.address", "", { shouldDirty: true });
                                setValue("parties.0.legalRep", "", { shouldDirty: true });
                              }}
                            />
                          ) : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </Section>

            {/* 3. 律师费 */}
            <Section title="③ 律师费">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {FEE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setValue("feeType", t, { shouldDirty: true })}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition-colors",
                      feeType === t
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-input"
                    )}
                  >
                    {feeTypeLabel[t]}
                  </button>
                ))}
              </div>

              {feeType === "FIXED" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="总金额（元）" required>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      className="font-mono"
                      {...register("feeAmount", { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="付款节点 / 分期约定">
                    <Input
                      placeholder="如：签约付 50%，开庭前付 30%，结案付 20%"
                      {...register("feeSchedule")}
                    />
                  </Field>
                </div>
              )}

              {feeType === "TIMED" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="小时费率（元 / 小时）" required>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      className="font-mono"
                      {...register("feeAmount", { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="计费说明 / 结算周期">
                    <Input
                      placeholder="如：合伙人 2000 元/时、授薪律师 1000 元/时；按月结算"
                      {...register("feeSchedule")}
                    />
                  </Field>
                </div>
              )}

              {feeType === "CONTINGENCY" && (
                <>
                  <Field label="基础办案费（元）" required>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      className="font-mono"
                      {...register("feeAmount", { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="风险代理收费方式" required hint="例：判决/调解执行到位后按到账金额 15% 收取；或：以胜诉金额阶梯计提：≤100 万部分 10%，>100 万部分 8%">
                    <Textarea
                      rows={3}
                      placeholder="详细描述风险代理收费方式 / 触发条件 / 计提比例"
                      {...register("contingencyTerms")}
                    />
                  </Field>
                  <Field label="付款节点">
                    <Input
                      placeholder="如：基础办案费签约付清；风险费执行到账后 7 日内支付"
                      {...register("feeSchedule")}
                    />
                  </Field>
                </>
              )}

              {feeType && (
                <Field label="费用备注（可选）">
                  <Input placeholder="如：含差旅 / 含诉讼费垫付" {...register("feeNote")} />
                </Field>
              )}
            </Section>

            {/* 4. 合同 */}
            <Section
              title="④ 委托合同 / 相关附件"
              headerAction={
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    className="h-7 gap-1"
                  >
                    <Paperclip className="h-3 w-3" />
                    添加
                  </Button>
                </>
              }
            >
              {contracts.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-background py-3 text-center text-xs text-muted-foreground">
                  上传委托代理合同、授权委托书等（加密存储，单文件 ≤ 20MB）
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {contracts.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground tabular">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setContracts((c) => c.filter((_, j) => j !== i))}
                        className="h-5 w-5 p-0 text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <DialogFooter className="border-t border-border px-5 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              提交审批
            </Button>
          </DialogFooter>
        </form>
        </FormProvider>
      </DialogContent>
      <CauseRecommendationDialog
        open={aiRecOpen}
        loading={aiRecLoading}
        candidates={aiRecCandidates}
        errorMessage={aiRecError}
        onSelect={handleAiRecSelect}
        onOpenChange={setAiRecOpen}
        onRetry={handleAiRecRetry}
      />
      <CauseAiManualDialog
        open={aiManualOpen}
        onOpenChange={setAiManualOpen}
        category={category}
        contextHints={(() => {
          const lines: string[] = [];
          const cf = watch("causeFreeText");
          if (cf) lines.push(`OCR 识别案由：${cf}`);
          const cd = watch("claimDescription");
          if (cd) lines.push(`诉讼请求：${cd}`);
          const opp = parties
            .filter((p) => p.role === "OPPOSING_PARTY")
            .map((p) => p.name)
            .filter(Boolean);
          if (opp.length) lines.push(`对方当事人：${opp.join("、")}`);
          return lines.join("\n");
        })()}
        onSelect={handleAiRecSelect}
      />
    </Dialog>
  );
}

function Section({
  title,
  required,
  headerAction,
  children
}: {
  title: string;
  required?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  // 把"① 案件类别"形式拆成 罗马数字 + 标题
  const match = title.match(/^([①-⑨])\s+(.+)$/);
  const map: Record<string, string> = {
    "①": "I",
    "②": "II",
    "③": "III",
    "④": "IV",
    "⑤": "V",
    "⑥": "VI",
    "⑦": "VII",
    "⑧": "VIII",
    "⑨": "IX"
  };
  const roman = match ? map[match[1]] : null;
  const text = match ? match[2] : title;

  return (
    <section
      className="space-y-2.5 rounded-lg border bg-card p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-baseline gap-2.5">
          {roman && (
            <span className="text-[0.7rem] text-primary">{roman}</span>
          )}
          <span className="text-[0.9rem] font-medium tracking-tight">
            {text}
            {required && <span className="ml-1 text-destructive">*</span>}
          </span>
        </h3>
        {headerAction}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  className,
  children
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
