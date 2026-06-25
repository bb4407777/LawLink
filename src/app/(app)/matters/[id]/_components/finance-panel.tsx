"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { AddBillingSheet, AddFeeEntrySheet } from "./finance-forms";
import type { FinancePayload, UserOption } from "./matter-detail-tabs";

export function FinancePanel({
  matterId,
  finance,
}: {
  matterId: string;
  finance: FinancePayload;
  userOptions: UserOption[];
  canRequestInvoice: boolean;
}) {
  const [billingOpen, setBillingOpen] = useState(false);
  const [feeEntryOpen, setFeeEntryOpen] = useState(false);

  const { stats } = finance;
  const outstanding = Math.max(stats.receivable - stats.received, 0);

  return (
    <section className="rounded-lg border border-border bg-card px-4 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">财务费用</span>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setBillingOpen(true)} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" />合同
          </Button>
          <Button size="sm" variant="outline" onClick={() => setFeeEntryOpen(true)} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" />收付
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1">
        <div className="rounded border bg-muted/30 px-1.5 py-1 text-center">
          <div className="text-[9px] text-muted-foreground leading-tight">合同额</div>
          <div className="font-mono text-[11px] font-medium tabular-nums">{formatCurrency(stats.contractAmount)}</div>
        </div>
        <div className="rounded border bg-muted/30 px-1.5 py-1 text-center">
          <div className="text-[9px] text-muted-foreground leading-tight">已收</div>
          <div className="font-mono text-[11px] font-medium tabular-nums text-emerald-600">{formatCurrency(stats.received)}</div>
        </div>
        <div className="rounded border bg-muted/30 px-1.5 py-1 text-center">
          <div className="text-[9px] text-muted-foreground leading-tight">待收</div>
          <div className="font-mono text-[11px] font-medium tabular-nums text-amber-600">{formatCurrency(outstanding)}</div>
        </div>
        <div className="rounded border bg-muted/30 px-1.5 py-1 text-center">
          <div className="text-[9px] text-muted-foreground leading-tight">应收</div>
          <div className="font-mono text-[11px] font-medium tabular-nums text-blue-600">{formatCurrency(stats.receivable)}</div>
        </div>
        <div className="rounded border bg-muted/30 px-1.5 py-1 text-center">
          <div className="text-[9px] text-muted-foreground leading-tight">入账</div>
          <div className="font-mono text-[11px] font-medium tabular-nums">¥0</div>
        </div>
        <div className="rounded border bg-muted/30 px-1.5 py-1 text-center">
          <div className="text-[9px] text-muted-foreground leading-tight">提酬</div>
          <div className="font-mono text-[11px] font-medium tabular-nums text-purple-600">{formatCurrency(stats.commission)}</div>
        </div>
      </div>

      <AddBillingSheet open={billingOpen} onOpenChange={setBillingOpen} matterId={matterId} />
      <AddFeeEntrySheet open={feeEntryOpen} onOpenChange={setFeeEntryOpen} matterId={matterId} billings={finance.billings.map(b => ({ id: b.id, title: b.title }))} />
    </section>
  );
}
