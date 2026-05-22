"use client";

import Link from "next/link";
import type { Matter } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  matterCategoryLabel,
  matterCategoryColor,
  matterStatusLabel,
  procedureTypeLabel
} from "@/lib/enums";

export type MatterRow = Matter & {
  primaryClient: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
  cause: { id: string; name: string } | null;
  procedures: { id: string; type: string; caseNumber: string | null; status: string }[];
  _count: { procedures: number };
};

export function MattersTable({ items }: { items: MatterRow[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/20 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          还没有案件。点击右上角 <span className="text-foreground">新建案件</span> 开始
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-popover/30">
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3 font-medium">编号 / 案件</th>
            <th className="px-5 py-3 font-medium">类别</th>
            <th className="px-5 py-3 font-medium">客户</th>
            <th className="px-5 py-3 font-medium">当前程序</th>
            <th className="px-5 py-3 font-medium">主办</th>
            <th className="px-5 py-3 font-medium">状态</th>
            <th className="px-5 py-3 font-medium">更新</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((m) => {
            const current = m.procedures[0];
            return (
              <tr key={m.id} className="transition-colors hover:bg-popover/40">
                <td className="px-5 py-3">
                  <Link href={`/matters/${m.id}`} className="block hover:text-primary">
                    <div className="font-mono text-xs text-muted-foreground">
                      {m.internalCode}
                    </div>
                    <div className="mt-0.5 font-medium">{m.title}</div>
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs"
                    style={{
                      borderColor: `${matterCategoryColor[m.category]}40`,
                      color: matterCategoryColor[m.category]
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: matterCategoryColor[m.category] }}
                    />
                    {matterCategoryLabel[m.category]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {m.primaryClient ? (
                    <Link
                      href={`/clients/${m.primaryClient.id}`}
                      className="text-foreground hover:text-primary"
                    >
                      {m.primaryClient.name}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {current ? (
                    <div>
                      <div className="text-xs">
                        {procedureTypeLabel[current.type as keyof typeof procedureTypeLabel]}
                      </div>
                      {current.caseNumber && (
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {current.caseNumber}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-muted-foreground">{m.owner?.name ?? "—"}</td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className="text-[10px]">
                    {matterStatusLabel[m.status]}
                  </Badge>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground tabular">
                  {new Date(m.updatedAt).toLocaleDateString("zh-CN")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
