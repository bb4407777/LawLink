"use client";

import Link from "next/link";
import { ChevronRight, Phone, MapPin, IdCard, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { clientTypeLabel, litigationStandingLabel } from "@/lib/enums";
import { cn } from "@/lib/utils";
import type { MatterPayload } from "./matter-detail-tabs";

type PartyRow = MatterPayload["parties"][number];

export function PartiesPanel({ matter }: { matter: MatterPayload }) {
  const ourSide = matter.parties.filter((p) => p.role === "CLIENT_PARTY");
  const opposing = matter.parties.filter((p) => p.role === "OPPOSING_PARTY");
  const thirdParty = matter.parties.filter((p) => p.role === "THIRD_PARTY");

  // 只渲染有内容的列，空列直接跳过
  const cols: { title: string; accent: string; items: React.ReactNode[] }[] = [];

  const clientItems: React.ReactNode[] = [
    ...matter.clientLinks.map((cl) => (
      <ClientCard
        key={cl.clientId}
        name={cl.client.name}
        typeLabel={clientTypeLabel[cl.client.type]}
        href={`/clients/${cl.client.id}`}
        primary={cl.isPrimary}
      />
    )),
    ...ourSide.map((p) => <PartyCard key={p.id} party={p} />)
  ];
  if (clientItems.length > 0) {
    cols.push({ title: "委托方", accent: "#5B8DEF", items: clientItems });
  }
  if (opposing.length > 0) {
    cols.push({
      title: "对方",
      accent: "#FB923C",
      items: opposing.map((p) => <PartyCard key={p.id} party={p} />)
    });
  }
  if (thirdParty.length > 0) {
    cols.push({
      title: "第三人",
      accent: "#9B7BF7",
      items: thirdParty.map((p) => <PartyCard key={p.id} party={p} />)
    });
  }

  if (cols.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="border-b border-border px-4 py-2 text-[13px] font-medium">参与方</header>
      <div
        className={cn(
          "grid grid-cols-1 gap-3 p-3",
          cols.length === 2 && "md:grid-cols-2",
          cols.length === 3 && "md:grid-cols-3"
        )}
      >
        {cols.map((c) => (
          <Column key={c.title} title={c.title} accent={c.accent}>
            {c.items}
          </Column>
        ))}
      </div>
    </section>
  );
}

function Column({
  title,
  accent,
  children
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full" style={{ backgroundColor: accent }} />
        <h3 className="text-[10.5px] font-medium tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ClientCard({
  name,
  typeLabel,
  href,
  primary
}: {
  name: string;
  typeLabel: string;
  href: string;
  primary: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 transition-colors hover:bg-muted/30"
    >
      <User className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.8} />
      <span className="truncate text-[12.5px] font-medium">{name}</span>
      <span className="text-[10.5px] text-muted-foreground">· {typeLabel}</span>
      {primary && <Badge variant="secondary" className="ml-auto h-4 px-1 text-[9.5px]">主</Badge>}
      <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

function PartyCard({ party }: { party: PartyRow }) {
  const standing = party.standing ? litigationStandingLabel[party.standing] : null;
  const hasExtra = party.idNumber || party.phone || party.address;
  return (
    <div className="rounded-md border border-border bg-background px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12.5px] font-medium">{party.name || "—"}</span>
        {standing && (
          <span className="shrink-0 rounded border border-border px-1 py-0 text-[9.5px] text-muted-foreground">
            {standing}
          </span>
        )}
      </div>
      {hasExtra && (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted-foreground">
          {party.idNumber && (
            <span className="flex items-center gap-1">
              <IdCard className="h-2.5 w-2.5" />
              <span className="font-mono truncate" title={party.idNumber}>{party.idNumber}</span>
            </span>
          )}
          {party.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-2.5 w-2.5" />
              <span className="font-mono">{party.phone}</span>
            </span>
          )}
          {party.address && (
            <span className="flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" />
              <span className="truncate" title={party.address}>{party.address}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
