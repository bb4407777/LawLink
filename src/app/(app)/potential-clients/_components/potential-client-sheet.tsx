"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import type { PotentialClient } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { potentialClientCreateSchema, type PotentialClientCreateInput } from "@/server/potential-clients/schemas";
import { createPotentialClient, updatePotentialClient } from "@/server/potential-clients/actions";
import { cn } from "@/lib/utils";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; editingClient: PotentialClient | null };

const emptyDefaults: PotentialClientCreateInput = { name: "", type: "INDIVIDUAL", phone: "", gender: null, idNumber: "", address: "", email: "", legalRep: "", ethnicity: "", industry: "", wechat: "", douyin: "", source: "", notes: "", tags: [], contactedAt: null };

export function PotentialClientSheet({ open, onOpenChange, editingClient }: Props) {
  const [isPending, startTransition] = useTransition();
  const isEdit = !!editingClient;
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<PotentialClientCreateInput>({
    resolver: zodResolver(potentialClientCreateSchema),
    defaultValues: emptyDefaults
  });
  const watchedTags = watch("tags");

  useEffect(() => {
    if (!open) return;
    if (editingClient) {
      reset({ name: editingClient.name, type: editingClient.type, phone: editingClient.phone ?? "", gender: editingClient.gender ?? null, idNumber: editingClient.idNumber ?? "", address: editingClient.address ?? "", email: editingClient.email ?? "", legalRep: editingClient.legalRep ?? "", ethnicity: editingClient.ethnicity ?? "", industry: editingClient.industry ?? "", wechat: editingClient.wechat ?? "", douyin: editingClient.douyin ?? "", source: editingClient.source ?? "", notes: editingClient.notes ?? "", tags: editingClient.tags, contactedAt: editingClient.contactedAt ?? null });
    } else reset(emptyDefaults);
  }, [editingClient, open, reset]);

  function onSubmit(values: PotentialClientCreateInput) {
    startTransition(async () => {
      try {
        if (isEdit && editingClient) { await updatePotentialClient({ id: editingClient.id, ...values }); toast.success("已更新"); }
        else { await createPotentialClient(values); toast.success("已创建"); }
        onOpenChange(false);
      } catch (err) { toast.error("失败", { description: err instanceof Error ? err.message : "" }); }
    });
  }

  function addTag(tag: string) { const t = tag.trim(); if (!t) return; const current = watchedTags || []; if (current.includes(t)) return; setValue("tags", [...current, t], { shouldDirty: true }); }
  function removeTag(tag: string) { setValue("tags", (watchedTags || []).filter(t => t !== tag), { shouldDirty: true }); }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border bg-background px-6 py-4">
          <SheetTitle>{isEdit ? "编辑潜在客户" : "新建潜在客户"}</SheetTitle>
          <SheetDescription>潜在客户基本信息</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">姓名 <span className="text-destructive">*</span></Label>
                <Input {...register("name")} placeholder="姓名" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">类型</Label>
                <Select value={watch("type")} onValueChange={v => setValue("type", v as "INDIVIDUAL" | "COMPANY" | "ORGANIZATION")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">个人</SelectItem>
                    <SelectItem value="COMPANY">公司</SelectItem>
                    <SelectItem value="ORGANIZATION">组织</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">性别</Label>
                <Select value={watch("gender") ?? ""} onValueChange={v => setValue("gender", v === "" ? null : v as "MALE" | "FEMALE")}>
                  <SelectTrigger><SelectValue placeholder="选择性别" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">男</SelectItem>
                    <SelectItem value="FEMALE">女</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">电话</Label><Input className="font-mono" {...register("phone")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">身份证号</Label><Input className="font-mono" {...register("idNumber")} placeholder="18位" /></div>
              <div className="space-y-1.5"><Label className="text-xs">微信</Label><Input {...register("wechat")} placeholder="微信号" /></div>
              <div className="space-y-1.5"><Label className="text-xs">抖音</Label><Input {...register("douyin")} placeholder="抖音号/昵称" /></div>
              <div className="space-y-1.5"><Label className="text-xs">邮箱</Label><Input type="email" {...register("email")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">地址</Label><Input {...register("address")} placeholder="通讯地址" /></div>
              <div className="space-y-1.5"><Label className="text-xs">来源</Label><Input placeholder="介绍人 / 线上咨询" {...register("source")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">联系日期</Label><Input type="date" {...register("contactedAt")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">法定代表人</Label><Input {...register("legalRep")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">民族</Label><Input {...register("ethnicity")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">行业</Label><Input {...register("industry")} /></div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">标签</Label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:border-primary">
                  {watchedTags?.map(t => <span key={t} className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 text-xs text-primary">{t}<button type="button" onClick={() => removeTag(t)} className="hover:text-foreground"><X className="h-3 w-3" /></button></span>)}
                  <input type="text" placeholder={(!watchedTags || watchedTags.length === 0) ? "回车添加" : ""} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ""; }}} className="flex-1 min-w-24 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2"><Label className="text-xs">备注</Label><Textarea rows={3} {...register("notes")} /></div>
            </div>
          </div>
          <SheetFooter className="border-t border-border bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>取消</Button>
            <Button type="submit" disabled={isPending} className="gap-1.5">{isPending && <Loader2 className="h-4 w-4 animate-spin" />}{isEdit ? "保存" : "创建"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
