"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { ClientType, Prisma } from "@prisma/client";
import {
  Info,
  Plus,
  Pencil,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { matterStatusLabel, procedureTypeLabel, matterCategoryKind } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { InfoPanel } from "./info-panel";
import { FinancePanel } from "./finance-panel";
import { NotesPanel } from "./notes-panel";
import { ProcedureRemindersAndMemos } from "./procedure-content";
import { ProcedureDocumentsSection } from "./procedure-documents-section";
import { ProcedureInfoPanel } from "./procedure-info-panel";

import { ApprovalsPanel } from "./approvals-panel";
import type { SealContractItem, ExpressItem } from "./info-extras";
import { AddProcedureSheet } from "./procedure-forms";
import { deleteProcedure } from "@/server/procedures/actions";
import { useRouter } from "next/navigation";
import { CustomFieldsPanel } from "./custom-fields-panel";
import { LifecycleActions } from "./lifecycle-actions";
import { ArchiveStatusBanner } from "./archive-status-banner";
import { ArchiveWizardDialog } from "./archive-wizard";
import type { FolderPayload, FolderDocument, TemplateSummary } from "./folder-types";
import type { PreservationCaseRow, UserOption as PresUserOption } from "@/app/(app)/preservation/_components/preservation-types";

type MatterPayload = Prisma.MatterGetPayload<{
  include: {
    primaryClient: { include: { contacts: { where: { isPrimary: true }; take: 1 } } };
    clientLinks: { include: { client: { select: { id: true; name: true; type: true; idNumber: true } } } };
    owner: { select: { id: true; name: true; role: true } };
    members: { include: { user: { select: { id: true; name: true; role: true } } } };
    cause: true;
    parties: true;
    relatedEntities: true;
    intake: { select: { counterclaim: true; claimDescription: true } };
    linksFrom: {
      include: { relatedMatter: { select: { id: true; internalCode: true; title: true } } };
    };
    linksTo: {
      include: { matter: { select: { id: true; internalCode: true; title: true } } };
    };
    procedures: {
      include: {
        deadlines: true;
        hearings: true;
        stages: true;
        procedureParties: { include: { party: true } };
        memos: true;
      };
    };
    timelineEvents: true;
  };
}>;

export type FinancePayload = {
  billings: {
    id: string;
    title: string;
    contractAmount: Prisma.Decimal;
    schedule: string | null;
    status: "DRAFT" | "ACTIVE" | "CLOSED";
    signedAt: Date | null;
    createdAt: Date;
  }[];
  entries: {
    id: string;
    type: "RECEIVABLE" | "RECEIVED" | "REFUND" | "COST" | "COMMISSION";
    amount: Prisma.Decimal;
    occurredAt: Date;
    billingId: string | null;
    invoiceNo: string | null;
    payerOrPayee: string | null;
    method: string | null;
    note: string | null;
    parentFeeEntryId: string | null;
    beneficiaryUserId: string | null;
    beneficiaryUser: { id: string; name: string } | null;
    parentFeeEntry: { id: string; type: string } | null;
  }[];
  plans: {
    id: string;
    userId: string;
    percent: Prisma.Decimal;
    label: string | null;
    active: boolean;
    user: { id: string; name: string; role: string };
  }[];
  stats: {
    contractAmount: number;
    receivable: number;
    received: number;
    refund: number;
    cost: number;
    commission: number;
    invoiced: number;
  };
};

type UserOption = { id: string; name: string; role: string };

export type NotePayload = {
  id: string;
  channel: "PHONE" | "WECHAT" | "EMAIL" | "MEETING" | "COURT" | "OTHER";
  withWhom: string | null;
  occurredAt: Date;
  content: string;
  tags: string[];
  author: { id: string; name: string };
  authorId: string;
  createdAt: Date;
};

export function MatterDetailTabs({
  matter,
  finance,
  userOptions,
  documents,
  intakeContracts,
  folders,
  folderDocuments,
  templates,
  preservations,
  colleagues,
  currentUserRole,
  canAssociateThisMatter,
  canLeadThisMatter,
  canOwnThisMatter,
  sealContracts,
  expresses,
  latestArchive,
  customFieldDefs,
  notes
}: {
  matter: MatterPayload;
  finance: FinancePayload;
  userOptions: UserOption[];
  documents: any[];
  intakeContracts: any[];
  folders: FolderPayload[];
  folderDocuments: FolderDocument[];
  templates: TemplateSummary[];
  preservations: PreservationCaseRow[];
  colleagues: PresUserOption[];
  currentUserRole: string | null;
  canAssociateThisMatter: boolean;
  canLeadThisMatter: boolean;
  canOwnThisMatter: boolean;
  sealContracts: SealContractItem[];
  expresses: ExpressItem[];
  latestArchive: {
    id: string;
    archiveNo: string;
    status: "PENDING_REVIEW" | "REJECTED" | "APPROVED";
    reviewedAt: Date | null;
    reviewNote: string | null;
    archivedBy: string;
    missingItems: string[];
  } | null;
  customFieldDefs: {
    id: string;
    key: string;
    label: string;
    fieldType: "TEXT" | "NUMBER" | "DATE" | "SELECT";
    options: string[];
    required: boolean;
  }[];
  notes: NotePayload[];
}) {
  const [selectedProcId, setSelectedProcId] = useState<string | null>(null);
  const [addProcOpen, setAddProcOpen] = useState(false);
  const [procEditOpen, setProcEditOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleDeleteProcedure(id: string) {
    startTransition(async () => {
      try {
        await deleteProcedure(id);
        toast.success("程序已删除");
        router.refresh();
      } catch (err) {
        toast.error("删除失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }
  const [archiveOpen, setArchiveOpen] = useState(false);

  const engagedProcedures = matter.procedures
    .filter((p) => p.engagement === "ENGAGED")
    .sort((a, b) => a.order - b.order);

  // 默认选中第一个在办程序（若有）
  const currentProcedure = selectedProcId
    ? engagedProcedures.find((p) => p.id === selectedProcId)
    : engagedProcedures[0] ?? null;

  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  // 当前选中程序的文档
  const procDocs = currentProcedure
    ? documents
        .filter((d) => d.procedureId === currentProcedure.id)
        .map((d) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          mimeType: d.mimeType,
          size: d.size,
          createdAt: d.createdAt,
          sourceParty: d.sourceParty,
          path: d.path
        }))
    : [];
  const procedureParties = buildProcedurePartyOptions(matter);
  const customValues =
    matter.customValues &&
    typeof matter.customValues === "object" &&
    !Array.isArray(matter.customValues)
      ? (matter.customValues as Record<string, string>)
      : {};
  const hasCustomFields = customFieldDefs.length > 0;

  return (
    <div className="space-y-4">
      {/* H1 头部 */}
      <motion.header
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-2"
      >
        <h1 className="min-w-0 flex-1 truncate text-[0.95rem] font-medium leading-tight" title={matter.title}>
          {matter.title}
        </h1>
        <MatterStatusPill status={matter.status} />
        {currentUserRole && canLeadThisMatter && (
          <LifecycleActions
            matterId={matter.id}
            status={matter.status}
            canArchive={canLeadThisMatter}
            isDeleted={!!matter.deletedAt}
          />
        )}
        {matter.deletedAt && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-600">
            已删除
          </span>
        )}
      </motion.header>

      {/* 归档状态 banner */}
      {latestArchive && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <ArchiveStatusBanner
            record={latestArchive}
            onReArchive={
              latestArchive.status === "REJECTED" &&
              canLeadThisMatter
                ? () => setArchiveOpen(true)
                : undefined
            }
          />
        </motion.div>
      )}

      {/* 单页竖向布局：基本信息+财务左栏 / 重要事项+用印右栏 */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {/* 左栏：基本信息 + 财务费用 */}
          <div className="flex flex-col gap-4 xl:col-span-3">
            <InfoPanel
              matter={matter}
              userOptions={userOptions}
              finance={finance}
              contracts={intakeContracts.map((d) => ({ id: d.id, name: d.name }))}
              canEditMatter={canOwnThisMatter}
              canManageRelatedMatters={canAssociateThisMatter}
            />
            <FinancePanel
              matterId={matter.id}
              finance={finance}
              userOptions={userOptions}
              canRequestInvoice={canAssociateThisMatter}
            />
          </div>
          {/* 右栏：重要事项 + 用印审批 */}
          <div className="flex flex-col gap-4 xl:col-span-2">
            <ProcedureRemindersAndMemos
              matterId={matter.id}
              procedures={engagedProcedures}
              currentProcedureId={currentProcedure?.id ?? ""}
              expresses={expresses}
              canManage={canAssociateThisMatter}
            />
            <ApprovalsPanel
              matterId={matter.id}
              matterTitle={matter.title}
              sealContracts={sealContracts}
              canRequest={canAssociateThisMatter}
            />
          </div>
        </div>

        {/* 案件程序 */}
        <section className="rounded-lg border border-border bg-card">
          <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
            <span className="text-[13px] font-medium">案件程序</span>
            {engagedProcedures.length === 0 ? (
              <span className="text-xs text-muted-foreground">暂无在办程序</span>
            ) : (
              engagedProcedures.map((p, idx) => {
                const isActive = currentProcedure?.id === p.id;
                return (
                  <span
                    key={p.id}
                    className={cn(
                      "group/proc inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedProcId(p.id)}
                      className="flex items-center gap-1.5"
                    >
                      <span className="font-medium text-primary">{ROMAN[idx] ?? idx + 1}</span>
                      <span>{p.customLabel ?? procedureTypeLabel[p.type]}</span>
                      {p.status === "CONCLUDED" && (
                        <Badge
                          variant="outline"
                          className="ml-0.5 border-border bg-muted/30 px-1 text-[9px] font-normal"
                        >
                          已结
                        </Badge>
                      )}
                    </button>
                    {canLeadThisMatter && (
                      <button
                        type="button"
                        onClick={() => {
                          const label = p.customLabel ?? procedureTypeLabel[p.type];
                          if (confirm(`确定删除程序「${label}」？该程序下的所有开庭、期限、备忘和材料记录将被一并删除，此操作不可撤销。`)) {
                            handleDeleteProcedure(p.id);
                          }
                        }}
                        className="ml-0.5 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/proc:opacity-100"
                        title="删除此程序"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })
            )}
            {canAssociateThisMatter && (
              <button
                type="button"
                onClick={() => setAddProcOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                添加程序
              </button>
            )}
            {currentProcedure && canAssociateThisMatter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProcEditOpen(true)}
                className="ml-auto h-6 gap-1 text-[11px] text-muted-foreground hover:text-primary"
              >
                <Pencil className="h-3 w-3" strokeWidth={1.8} />
                编辑
              </Button>
            )}
          </header>

          {currentProcedure ? (
            <div className="space-y-4 p-4">
              <ProcedureInfoPanel
                procedure={currentProcedure}
                parties={procedureParties}
                requestContent={matter.intake?.claimDescription ?? null}
                editOpen={procEditOpen}
                onEditOpenChange={setProcEditOpen}
              />
              <ProcedureDocumentsSection
                matterId={matter.id}
                procedureId={currentProcedure.id}
                documents={procDocs}
                procedureParties={currentProcedure.procedureParties}
                canManage={canAssociateThisMatter}
              />
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              请先添加程序以管理开庭、期限和案件材料
            </p>
          )}
        </section>

        {/* 办案记录 */}
        <div className="rounded-lg border border-border bg-card p-4">
          <NotesPanel matterId={matter.id} notes={notes} />
        </div>

        {hasCustomFields && (
          <CustomFieldsPanel
            matterId={matter.id}
            defs={customFieldDefs}
            values={customValues}
            canEdit={canLeadThisMatter}
          />
        )}

      </motion.div>

      {canAssociateThisMatter && (
        <AddProcedureSheet
          open={addProcOpen}
          onOpenChange={setAddProcOpen}
          matterId={matter.id}
          category={matter.category}
          nextOrder={matter.procedures.length + 1}
          colleagues={colleagues}
          existingTypes={matter.procedures.map(p => p.type)}
        />
      )}
      {canLeadThisMatter && (
        <ArchiveWizardDialog
          matterId={matter.id}
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
        />
      )}
    </div>
  );
}

function MatterStatusPill({ status }: { status: MatterPayload["status"] }) {
  const map: Record<MatterPayload["status"], { label: string; cls: string }> = {
    PENDING_ACCEPTANCE: {
      label: matterStatusLabel.PENDING_ACCEPTANCE,
      cls: "bg-amber-500/15 text-amber-700 border-amber-500/30"
    },
    IN_PROGRESS: {
      label: matterStatusLabel.IN_PROGRESS,
      cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
    },
    FILING_MATERIALS: {
      label: matterStatusLabel.FILING_MATERIALS,
      cls: "bg-orange-500/15 text-orange-700 border-orange-500/30"
    },
    FILING_MATERIALS_SIGN: {
      label: matterStatusLabel.FILING_MATERIALS_SIGN,
      cls: "bg-orange-400/15 text-orange-600 border-orange-400/30"
    },
    ONLINE_FILING: {
      label: matterStatusLabel.ONLINE_FILING,
      cls: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30"
    },
    ONLINE_FILING_REVIEW: {
      label: matterStatusLabel.ONLINE_FILING_REVIEW,
      cls: "bg-yellow-400/15 text-yellow-600 border-yellow-400/30"
    },
    FILING_ACCEPTED: {
      label: matterStatusLabel.FILING_ACCEPTED,
      cls: "bg-lime-500/15 text-lime-700 border-lime-500/30"
    },
    FEE_PAYMENT_PENDING: {
      label: matterStatusLabel.FEE_PAYMENT_PENDING,
      cls: "bg-rose-500/15 text-rose-700 border-rose-500/30"
    },
    FEE_PAID: {
      label: matterStatusLabel.FEE_PAID,
      cls: "bg-rose-400/15 text-rose-600 border-rose-400/30"
    },
    HEARING_SCHEDULED: {
      label: matterStatusLabel.HEARING_SCHEDULED,
      cls: "bg-sky-500/15 text-sky-700 border-sky-500/30"
    },
    POST_HEARING: {
      label: matterStatusLabel.POST_HEARING,
      cls: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30"
    },
    POST_JUDGMENT: {
      label: matterStatusLabel.POST_JUDGMENT,
      cls: "bg-violet-500/15 text-violet-700 border-violet-500/30"
    },
    EXECUTION_MATERIALS: {
      label: matterStatusLabel.EXECUTION_MATERIALS,
      cls: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30"
    },
    EXECUTION_MATERIALS_SIGN: {
      label: matterStatusLabel.EXECUTION_MATERIALS_SIGN,
      cls: "bg-cyan-400/15 text-cyan-600 border-cyan-400/30"
    },
    EXECUTION_ONLINE_FILING: {
      label: matterStatusLabel.EXECUTION_ONLINE_FILING,
      cls: "bg-teal-500/15 text-teal-700 border-teal-500/30"
    },
    EXECUTION_ONLINE_REVIEW: {
      label: matterStatusLabel.EXECUTION_ONLINE_REVIEW,
      cls: "bg-teal-400/15 text-teal-600 border-teal-400/30"
    },
    EXECUTION_PRESERVATION: {
      label: matterStatusLabel.EXECUTION_PRESERVATION,
      cls: "bg-red-500/15 text-red-700 border-red-500/30"
    },
    EXECUTION: {
      label: matterStatusLabel.EXECUTION,
      cls: "bg-red-400/15 text-red-600 border-red-400/30"
    },
    INVESTIGATION: {
      label: matterStatusLabel.INVESTIGATION,
      cls: "bg-orange-600/15 text-orange-800 border-orange-600/30"
    },
    DETENTION_30: {
      label: matterStatusLabel.DETENTION_30,
      cls: "bg-orange-500/15 text-orange-700 border-orange-500/30"
    },
    ARREST_REVIEW_7: {
      label: matterStatusLabel.ARREST_REVIEW_7,
      cls: "bg-orange-400/15 text-orange-600 border-orange-400/30"
    },
    POST_ARREST_REVIEW: {
      label: matterStatusLabel.POST_ARREST_REVIEW,
      cls: "bg-amber-500/15 text-amber-700 border-amber-500/30"
    },
    CUSTODY_NECESSITY: {
      label: matterStatusLabel.CUSTODY_NECESSITY,
      cls: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30"
    },
    BAIL_PENDING: {
      label: matterStatusLabel.BAIL_PENDING,
      cls: "bg-lime-500/15 text-lime-700 border-lime-500/30"
    },
    PROSECUTION_REVIEW: {
      label: matterStatusLabel.PROSECUTION_REVIEW,
      cls: "bg-amber-600/15 text-amber-800 border-amber-600/30"
    },
    TRIAL: {
      label: matterStatusLabel.TRIAL,
      cls: "bg-red-600/15 text-red-800 border-red-600/30"
    },
    CRIMINAL_EXECUTION: {
      label: matterStatusLabel.CRIMINAL_EXECUTION,
      cls: "bg-rose-500/15 text-rose-700 border-rose-500/30"
    },
    ON_HOLD: {
      label: matterStatusLabel.ON_HOLD,
      cls: "bg-slate-400/15 text-slate-700 border-slate-400/30"
    },
    PENDING_ARCHIVE: {
      label: matterStatusLabel.PENDING_ARCHIVE,
      cls: "bg-gray-400/15 text-gray-600 border-gray-400/30"
    },
    CLOSED: {
      label: matterStatusLabel.CLOSED,
      cls: "bg-blue-500/15 text-blue-700 border-blue-500/30"
    },
    ARCHIVED: {
      label: matterStatusLabel.ARCHIVED,
      cls: "bg-purple-500/15 text-purple-700 border-purple-500/30"
    }
  };
  const m = map[status];
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-[12px] font-medium",
        m.cls
      )}
    >
      {m.label}
    </span>
  );
}

function clientTypeToPartyType(type: ClientType) {
  if (type === "INDIVIDUAL") return "NATURAL_PERSON";
  if (type === "COMPANY") return "COMPANY";
  return "OTHER_ORG";
}

function buildProcedurePartyOptions(matter: MatterPayload) {
  const parties = [...matter.parties];
  const seenClientNames = new Set(
    parties.filter((party) => party.role === "CLIENT_PARTY").map((party) => party.name.trim())
  );
  const clients = [
    ...(matter.primaryClient ? [matter.primaryClient] : []),
    ...matter.clientLinks.map((link) => link.client)
  ];
  const seenClientIds = new Set<string>();

  for (const client of clients) {
    if (seenClientIds.has(client.id) || seenClientNames.has(client.name.trim())) continue;
    seenClientIds.add(client.id);
    parties.push({
      id: `client:${client.id}`,
      matterId: matter.id,
      intakeId: null,
      role: "CLIENT_PARTY",
      standing: null,
      ordinal: 0,
      name: client.name,
      partyType: clientTypeToPartyType(client.type),
      idNumber: client.type === "INDIVIDUAL" ? client.idNumber : null,
      phone: null,
      address: null,
      legalRep: null,
      contactName: null,
      enterpriseId: null,
      enterpriseSocialCode: client.type === "INDIVIDUAL" ? null : client.idNumber,
      enterpriseName: client.type === "INDIVIDUAL" ? null : client.name,
      enterpriseBoundAt: null,
      opposingPartyId: null,
      notes: "案件关联客户",
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return parties;
}

export type { MatterPayload, UserOption };
