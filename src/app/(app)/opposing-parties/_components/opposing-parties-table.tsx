"use client";

import Link from "next/link";
import { Building2, User, Pencil, Phone } from "lucide-react";
import type { OpposingParty, PartyType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { opposingPartyTypeLabel } from "@/lib/enums";

type OpposingPartyRow = OpposingParty & {
  _count: { parties: number };
};

const TypeIcon = ({ partyType }: { partyType: PartyType }) => {
  const cls = "h-3.5 w-3.5";
  if (partyType === "NATURAL_PERSON") return <User className={cls} />;
  return <Building2 className={cls} />;
};

export function OpposingPartiesTable({
  items,
  onEdit
}: {
  items: OpposingPartyRow[];
  onEdit: (c: OpposingPartyRow) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/30 flex flex-col items-center gap-2 py-20 text-center">
        <div className="text-sm text-muted-foreground">还没有对方当事人</div>
        <div className="text-xs text-muted-foreground">
          点击右上角 <span className="text-foreground/80">新建当事人</span> 开始
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 桌面端表格 */}
      <div className="ll-surface hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[0.68rem] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2.5">当事人</th>
              <th className="px-4 py-2.5">类型</th>
              <th className="px-4 py-2.5">联系方式</th>
              <th className="px-4 py-2.5">关联案件</th>
              <th className="px-4 py-2.5">标签</th>
              <th className="w-20 px-5 py-2.5 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr
                key={c.id}
                className="group border-t border-border transition-colors hover:bg-muted/30"
              >
                <td className="px-5 py-2.5">
                  <Link href={`/opposing-parties/${c.id}`} className="block">
                    <div className="text-[0.92rem] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                      {c.name}
                    </div>
                    {c.idNumber && (
                      <div className="mt-1 font-mono text-[10.5px] tracking-wide text-muted-foreground tabular">
                        {c.idNumber}
                      </div>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-0.5 text-[11px]">
                    <TypeIcon partyType={c.partyType} />
                    {opposingPartyTypeLabel[c.partyType]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {c.phone ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <Phone className="h-3 w-3" strokeWidth={1.8} />
                      <span className="font-mono tabular">{c.phone}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className="ll-stat text-base">{c._count.parties}</span>
                  <span className="ml-1.5 font-mono text-[10.5px] text-muted-foreground tabular">
                    个案件
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-2.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(c)}
                    className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="编辑"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 移动端卡片列表 */}
      <div className="space-y-2 md:hidden">
        {items.map((c) => (
          <div key={c.id} className="ll-surface rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/opposing-parties/${c.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  <span className="inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-[10px]">
                    <TypeIcon partyType={c.partyType} />
                    {opposingPartyTypeLabel[c.partyType]}
                  </span>
                </div>
                {c.idNumber && (
                  <div className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">
                    {c.idNumber}
                  </div>
                )}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(c)}
                className="h-7 w-7 shrink-0 p-0"
                aria-label="编辑"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {c.phone && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="h-3 w-3" strokeWidth={1.8} />
                  {c.phone}
                </span>
              )}
              <span className="ll-stat">{c._count.parties} 个案件</span>
            </div>
            {c.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {c.tags.slice(0, 3).map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] font-normal">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
