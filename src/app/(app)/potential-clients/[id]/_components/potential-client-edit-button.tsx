"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { PotentialClient } from "@prisma/client";
import { PotentialClientSheet } from "@/app/(app)/potential-clients/_components/potential-client-sheet";

export function PotentialClientEditButton({ client }: { client: PotentialClient }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-primary">
        <Pencil className="h-3.5 w-3.5" />编辑信息
      </button>
      <PotentialClientSheet open={open} onOpenChange={setOpen} editingClient={client} />
    </>
  );
}
