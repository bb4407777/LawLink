"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { OpposingParty } from "@prisma/client";
import { OpposingPartySheet } from "@/app/(app)/opposing-parties/_components/opposing-party-sheet";

export function OpposingPartyEditButton({
  opposingParty
}: {
  opposingParty: OpposingParty;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-primary"
      >
        <Pencil className="h-3.5 w-3.5" />
        编辑信息
      </button>
      <OpposingPartySheet open={open} onOpenChange={setOpen} editingOpposingParty={opposingParty} />
    </>
  );
}
