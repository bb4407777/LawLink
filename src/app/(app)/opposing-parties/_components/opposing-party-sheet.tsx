"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import type { OpposingParty } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import {
  opposingPartyCreateSchema,
  type OpposingPartyCreateInput
} from "@/server/opposing-parties/schemas";
import { createOpposingParty, updateOpposingParty } from "@/server/opposing-parties/actions";
import { OPPOSING_PARTY_TYPE_OPTIONS, opposingPartyTypeLabel } from "@/lib/enums";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingOpposingParty: OpposingParty | null;
};

const emptyDefaults: OpposingPartyCreateInput = {
  name: "",
  partyType: "NATURAL_PERSON",
  idNumber: "",
  phone: "",
  address: "",
  legalRep: "",
  notes: "",
  tags: []
};

export function OpposingPartySheet({ open, onOpenChange, editingOpposingParty }: Props) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!editingOpposingParty;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<OpposingPartyCreateInput>({
    resolver: zodResolver(opposingPartyCreateSchema),
    defaultValues: emptyDefaults
  });

  const watchedType = watch("partyType");
  const watchedTags = watch("tags");
  const isCompany = watchedType !== "NATURAL_PERSON";

  useEffect(() => {
    if (!open) return;
    if (editingOpposingParty) {
      reset({
        name: editingOpposingParty.name,
        partyType: editingOpposingParty.partyType,
        idNumber: editingOpposingParty.idNumber ?? "",
        phone: editingOpposingParty.phone ?? "",
        address: editingOpposingParty.address ?? "",
        legalRep: editingOpposingParty.legalRep ?? "",
        notes: editingOpposingParty.notes ?? "",
        tags: editingOpposingParty.tags
      });
    } else {
      reset(emptyDefaults);
    }
  }, [editingOpposingParty, open, reset]);

  function onSubmit(values: OpposingPartyCreateInput) {
    startTransition(async () => {
      try {
        if (isEdit && editingOpposingParty) {
          await updateOpposingParty({ id: editingOpposingParty.id, ...values });
          toast.success("对方当事人已更新");
        } else {
          await createOpposingParty(values);
          toast.success("对方当事人已创建");
        }
        onOpenChange(false);
      } catch (err) {
        toast.error("保存失败", {
          description: err instanceof Error ? err.message : "请稍后重试"
        });
      }
    });
  }

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t) return;
    const current = watchedTags || [];
    if (current.includes(t)) return;
    setValue("tags", [...current, t], { shouldDirty: true });
  }

  function removeTag(tag: string) {
    setValue("tags", (watchedTags || []).filter((t) => t !== tag), { shouldDirty: true });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border bg-background px-6 py-4">
          <SheetTitle className="text-lg">
            {isEdit ? "编辑对方当事人" : "新建对方当事人"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            对方当事人主体信息（姓名 / 公司名 + 证件号 + 联系方式）
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <Section title="基本信息">
              <Field label="名称" required error={errors.name?.message}>
                <Input
                  placeholder={isCompany ? "某某有限公司" : "姓名"}
                  {...register("name")}
                />
              </Field>

              <Field label="主体类型" required>
                <Select
                  value={watchedType}
                  onValueChange={(v) =>
                    setValue("partyType", v as OpposingPartyCreateInput["partyType"], {
                      shouldDirty: true
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPPOSING_PARTY_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {opposingPartyTypeLabel[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={isCompany ? "统一社会信用代码" : "身份证号"}>
                <Input
                  className="font-mono"
                  placeholder={isCompany ? "18 位信用代码" : "18 位身份证号"}
                  {...register("idNumber")}
                />
              </Field>

              <Field label="联系电话">
                <Input className="font-mono" placeholder="11 位手机号" {...register("phone")} />
              </Field>

              {isCompany && (
                <Field label="法定代表人">
                  <Input placeholder="法定代表人姓名" {...register("legalRep")} />
                </Field>
              )}

              <Field label="地址" full>
                <Input placeholder="详细地址" {...register("address")} />
              </Field>

              <Field label="标签" full>
                <TagInput tags={watchedTags || []} onAdd={addTag} onRemove={removeTag} />
              </Field>

              <Field label="备注" full>
                <Textarea rows={3} placeholder="可选" {...register("notes")} />
              </Field>
            </Section>
          </div>

          <SheetFooter className="border-t border-border bg-background px-6 py-4">
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
              {isEdit ? "保存" : "创建"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <header className="mb-3 flex items-center gap-2">
        <span className="h-3 w-0.5 rounded-full bg-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  full,
  error,
  children
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", full && "col-span-2")}>
      <Label className="flex items-center gap-1 text-xs">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TagInput({
  tags,
  onAdd,
  onRemove
}: {
  tags: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:border-primary">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs text-primary"
        >
          {t}
          <button
            type="button"
            onClick={() => onRemove(t)}
            className="hover:text-foreground"
            aria-label={`移除 ${t}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        placeholder={tags.length === 0 ? "输入后回车添加标签" : ""}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).value = "";
          }
        }}
        className="flex-1 min-w-24 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
