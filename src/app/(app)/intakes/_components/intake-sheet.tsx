"use client";

import { useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { MatterCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { matterCategoryLabel } from "@/lib/enums";
import { intakeCreateSchema, type IntakeCreateInput } from "@/server/intakes/schemas";
import { createIntake } from "@/server/intakes/actions";
import { cn } from "@/lib/utils";
import { CauseCombobox } from "@/app/(app)/matters/_components/cause-combobox";
import type { ClientOption } from "@/app/(app)/matters/_components/matters-view";

const CATEGORIES: MatterCategory[] = [
  "CIVIL_COMMERCIAL",
  "CRIMINAL",
  "ADMINISTRATIVE",
  "NON_LITIGATION",
  "LEGAL_COUNSEL",
  "SPECIAL_PROJECT"
];

const defaults: IntakeCreateInput = {
  title: "",
  category: "CIVIL_COMMERCIAL",
  causeId: "",
  causeFreeText: "",
  description: "",
  source: "",
  clientId: "",
  parties: []
};

export function IntakeSheet({
  open,
  onOpenChange,
  clientOptions
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientOptions: ClientOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<IntakeCreateInput>({
    resolver: zodResolver(intakeCreateSchema),
    defaultValues: defaults
  });

  const { fields: parties, append: appendParty, remove: removeParty } = useFieldArray({
    control,
    name: "parties"
  });

  const category = watch("category");
  const clientId = watch("clientId");

  function onSubmit(values: IntakeCreateInput) {
    startTransition(async () => {
      try {
        const res = await createIntake(values);
        toast.success("收案已创建");
        reset(defaults);
        onOpenChange(false);
        if (res.id) router.push(`/intakes/${res.id}`);
      } catch (err) {
        toast.error("创建失败", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-xl flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border bg-background/60 px-6 py-4 backdrop-blur">
          <SheetTitle>新建收案</SheetTitle>
          <SheetDescription className="text-xs">
            收案 = 律师介入这件事的起点。冲突检索可在创建后立即触发
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* 类别 */}
            <div className="space-y-2">
              <Label className="text-xs">案件类别 *</Label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.slice(0, 3).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValue("category", c)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition-colors",
                      category === c
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background/40 text-muted-foreground hover:border-input"
                    )}
                  >
                    {matterCategoryLabel[c]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.slice(3).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValue("category", c)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition-colors",
                      category === c
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background/40 text-muted-foreground hover:border-input"
                    )}
                  >
                    {matterCategoryLabel[c]}
                  </button>
                ))}
              </div>
            </div>

            {/* 基本 */}
            <div className="space-y-3">
              <Field label="标题" required error={errors.title?.message}>
                <Input placeholder="如：某建设工程合同纠纷咨询" {...register("title")} />
              </Field>

              <Field label="案由">
                <CauseCombobox
                  category={category}
                  value={watch("causeId") || ""}
                  onChange={(id) => setValue("causeId", id, { shouldDirty: true })}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="案源">
                  <Input placeholder="介绍人 / 来源" {...register("source")} />
                </Field>
                <Field label="委托方">
                  <select
                    value={clientId ?? ""}
                    onChange={(e) =>
                      setValue("clientId", e.target.value, { shouldDirty: true })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">未选择 / 暂未建档</option>
                    {clientOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="描述">
                <Textarea
                  rows={3}
                  placeholder="简述案情、客户诉求、争议焦点等"
                  {...register("description")}
                />
              </Field>
            </div>

            {/* 当事人（对方 / 第三人，用于冲突检索） */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-xs">对方 / 第三人（用于冲突检索）</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendParty({
                        role: "OPPOSING_PARTY",
                        ordinal: parties.filter((p) => p.role === "OPPOSING_PARTY").length + 1,
                        name: "",
                        idNumber: "",
                        phone: "",
                        address: "",
                        legalRep: "",
                        notes: ""
                      })
                    }
                    className="h-7 gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    对方
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendParty({
                        role: "THIRD_PARTY",
                        ordinal: parties.filter((p) => p.role === "THIRD_PARTY").length + 1,
                        name: "",
                        idNumber: "",
                        phone: "",
                        address: "",
                        legalRep: "",
                        notes: ""
                      })
                    }
                    className="h-7 gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    第三人
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {parties.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border bg-background/40 py-3 text-center text-xs text-muted-foreground">
                    暂无相对方，添加后可触发冲突检索
                  </p>
                ) : (
                  parties.map((p, idx) => (
                    <div key={p.id} className="rounded-lg border border-border bg-background/40 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {p.role === "OPPOSING_PARTY" ? "对方" : "第三人"} {p.ordinal}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParty(idx)}
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="姓名 / 名称" {...register(`parties.${idx}.name`)} />
                        <Input
                          placeholder="身份证 / 信用代码"
                          className="font-mono"
                          {...register(`parties.${idx}.idNumber`)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <SheetFooter className="border-t border-border bg-background/60 px-6 py-4 backdrop-blur">
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
              创建收案
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  error,
  children
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
