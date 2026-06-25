import { listMatters } from "@/server/matters/actions";
import { listIntakes } from "@/server/intakes/actions";
import { listClients } from "@/server/clients/actions";
import { listActiveColleagues } from "@/server/users/actions";
import {
  getMattersOverviewStats,
  getMattersCategoryDistribution,
  getMattersRevenueTrend
} from "@/server/matters/overview-stats";
import { MattersView } from "./_components/matters-view";
import type { MatterCategory } from "@prisma/client";

export type MattersTab = "intake" | "revision" | "active" | "filingMaterials" | "filingMaterialsSign" | "onlineFiling" | "onlineFilingReview" | "filingAccepted" | "feePaymentPending" | "feePaid" | "hearingScheduled" | "postHearing" | "postJudgment" | "executionMaterials" | "executionMaterialsSign" | "executionOnlineFiling" | "executionOnlineReview" | "executionPreservation" | "execution" | "detention30" | "arrestReview7" | "postArrestReview" | "prosecutionReview" | "trial" | "criminalExecution" | "pendingArchive" | "archived" | "deleted" | "all";
export type MatterSortBy = "hearing" | "intakeDate" | "claimAmount" | "contractAmount" | "receivedAmount" | "internalCode";
export type MatterSortDir = "asc" | "desc";

function resolveTab(input?: string): MattersTab {
  const validTabs = ["intake","revision","active","filingMaterials","filingMaterialsSign","onlineFiling","onlineFilingReview","filingAccepted","feePaymentPending","feePaid","hearingScheduled","postHearing","postJudgment","executionMaterials","executionMaterialsSign","executionOnlineFiling","executionOnlineReview","executionPreservation","execution","detention30","arrestReview7","postArrestReview","custodyNecessity","bailPending","prosecutionReview","trial","criminalExecution","pendingArchive","archived","deleted","all"];
  if (input && validTabs.includes(input)) return input as MattersTab;
  return "all";
}

function defaultSortByForTab(tab: MattersTab): MatterSortBy {
  return "intakeDate";
}

function supportsSortBy(tab: MattersTab, sortBy: MatterSortBy) {
  if (sortBy === "hearing") return tab === "active" || tab === "all";
  return true;
}

function resolveSortBy(input: string | undefined, tab: MattersTab): MatterSortBy {
  const candidate =
    input === "hearing" || input === "intakeDate" || input === "claimAmount" || input === "contractAmount" || input === "receivedAmount"
      ? input
      : undefined;
  if (candidate && supportsSortBy(tab, candidate)) return candidate;
  return defaultSortByForTab(tab);
}

function resolveSortDir(input?: string): MatterSortDir {
  return input === "asc" ? "asc" : "desc";
}

function resolveDateStart(input?: string) {
  return resolveDateBoundary(input, false);
}

function resolveDateEnd(input?: string) {
  return resolveDateBoundary(input, true);
}

function resolveDateBoundary(input: string | undefined, endOfDay: boolean) {
  if (!input) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  );
}

type Props = {
  searchParams: {
    tab?: string;
    search?: string;
    category?: MatterCategory;
    categoryGroup?: string; // civil | criminal | nonLitigation
    status?: string; // all tab 下的状态筛选
    from?: string; // 收案时间起 yyyy-mm-dd
    to?: string; // 收案时间止
    sortBy?: string;
    sortDir?: string;
    page?: string;
    new?: string;
  };
};

export default async function MattersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tab = resolveTab(sp.tab);
  const page = sp.page ? Number(sp.page) : 1;
  const sortBy = resolveSortBy(sp.sortBy, tab);
  const sortDir = resolveSortDir(sp.sortDir);
  const dateFrom = resolveDateStart(sp.from);
  const dateTo = resolveDateEnd(sp.to);

  // categoryGroup → categoryIn 数组
  const CATEGORY_GROUP_MAP: Record<string, MatterCategory[]> = {
    civil: ["CIVIL_COMMERCIAL", "LABOR_ARBITRATION", "COMMERCIAL_ARBITRATION", "ADMINISTRATIVE"],
    criminal: ["CRIMINAL"],
    nonLitigation: ["NON_LITIGATION"],
    legalCounsel: ["LEGAL_COUNSEL"],
    specialProject: ["SPECIAL_PROJECT"],
    agentFiling: ["AGENT_FILING"],
    consultation: ["CONSULTATION"],
    publicSource: ["PUBLIC_SOURCE"]
  };
  const categoryIn = sp.categoryGroup ? CATEGORY_GROUP_MAP[sp.categoryGroup] : undefined;

  // 收案抽屉所需：客户下拉 + 同事列表
  const [clientsResponse, colleagues] = await Promise.all([
    listClients({ pageSize: 100 }),
    listActiveColleagues()
  ]);

  // 非 intake/revision 标签页 + 无 categoryGroup：显示统计概览
  const isOverviewTab = !(tab === "intake" || tab === "revision") && !sp.categoryGroup;
  const [overviewStats, categoryDistribution, revenueTrend] = isOverviewTab
    ? await Promise.all([
        getMattersOverviewStats(),
        getMattersCategoryDistribution(),
        getMattersRevenueTrend()
      ])
    : [undefined, undefined, undefined];

  // 独立律师，无审批流程（intake/revision 标签已隐藏）
  if ((tab === "intake" || tab === "revision") && !sp.categoryGroup) {
    // fallback：旧 intake/revision 标签已隐藏，降级为全部案件
    const intakeSortBy = sortBy === "claimAmount" ? "claimAmount" : "intakeDate";
    const intakes = await listIntakes({
      search: sp.search,
      category: sp.category,
      statusIn:
        tab === "intake"
          ? ["INTAKE", "PENDING_CONFIRMATION"]
          : ["NEEDS_REVISION"],
      receivedAtFrom: dateFrom,
      receivedAtTo: dateTo,
      sortBy: intakeSortBy,
      sortDir,
      page,
      pageSize: 30
    });
    return (
      <MattersView
        tab={tab}
        intakeData={{
          items: intakes.items.map((i) => ({
            id: i.id,
            title: i.title,
            category: i.category,
            status: i.status,
            receivedAt: i.receivedAt,
            client: i.client ? { id: i.client.id, name: i.client.name } : null,
            cause: i.cause,
            parties: i.parties,
            conflictChecks: i.conflictChecks,
            matter: i.matter,
            claimAmount: i.claimAmount ? Number(i.claimAmount) : null,
            ownerName: i.ownerUser?.name ?? null
          })),
          total: intakes.total,
          page: intakes.page,
          pageSize: intakes.pageSize
        }}
        clientOptions={clientsResponse.items.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type
        }))}
        colleagues={colleagues}
        initialFilters={{
          search: sp.search ?? "",
          category: sp.category ?? "ALL",
          categoryGroup: sp.categoryGroup,
          from: sp.from,
          to: sp.to,
          sortBy: intakeSortBy,
          sortDir,
          page
        }}
        autoOpenIntake={sp.new === "1"}
        overviewStats={overviewStats}
        categoryDistribution={categoryDistribution}
        revenueTrend={revenueTrend}
      />
    );
  }

  // 阶段标签页：查 Matter 表
  const stageTabMap: Record<string, string> = {
    filingMaterials: "FILING_MATERIALS",
    filingMaterialsSign: "FILING_MATERIALS_SIGN",
    onlineFiling: "ONLINE_FILING",
    onlineFilingReview: "ONLINE_FILING_REVIEW",
    filingAccepted: "FILING_ACCEPTED",
    feePaymentPending: "FEE_PAYMENT_PENDING",
    feePaid: "FEE_PAID",
    hearingScheduled: "HEARING_SCHEDULED",
    postHearing: "POST_HEARING",
    postJudgment: "POST_JUDGMENT",
    executionMaterials: "EXECUTION_MATERIALS",
    executionMaterialsSign: "EXECUTION_MATERIALS_SIGN",
    executionOnlineFiling: "EXECUTION_ONLINE_FILING",
    executionOnlineReview: "EXECUTION_ONLINE_REVIEW",
    executionPreservation: "EXECUTION_PRESERVATION",
    execution: "EXECUTION",
    detention30: "DETENTION_30",
    arrestReview7: "ARREST_REVIEW_7",
    postArrestReview: "POST_ARREST_REVIEW",
    custodyNecessity: "CUSTODY_NECESSITY",
    bailPending: "BAIL_PENDING",
    prosecutionReview: "PROSECUTION_REVIEW",
    trial: "TRIAL",
    criminalExecution: "CRIMINAL_EXECUTION",
    pendingArchive: "PENDING_ARCHIVE",
    archived: "ARCHIVED"
  };

  let statusGroup: Record<string, unknown> = {};
  let queryExtras: Record<string, unknown> = {};
  if (tab === "all") {
    statusGroup = { statusNotIn: ["PENDING_ACCEPTANCE"] };
  } else if (tab === "active") {
    statusGroup = { statusNotIn: ["ARCHIVED", "PENDING_ACCEPTANCE"] };
  } else if (tab === "intake") {
    statusGroup = { statusIn: ["PENDING_ACCEPTANCE"] };
  } else if (tab === "deleted") {
    queryExtras = { includeDeleted: true };
  } else if (stageTabMap[tab]) {
    statusGroup = { statusIn: [stageTabMap[tab]] };
  }

  const matters = await listMatters({
    search: sp.search,
    category: sp.category,
    categoryIn,
    page,
    pageSize: 50,
    ...statusGroup,
    ...queryExtras,
    intakeDateFrom: dateFrom,
    intakeDateTo: dateTo,
    sortBy,
    sortDir
  });

  return (
    <MattersView
      tab={tab}
      matterData={{
        items: matters.items.map((m) => ({
          ...m,
          claimAmount: m.claimAmount ? Number(m.claimAmount) : null,
        })),
        total: matters.total,
        page: matters.page,
        pageSize: matters.pageSize
      }}
      clientOptions={clientsResponse.items.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type
      }))}
      colleagues={colleagues}
      initialFilters={{
        search: sp.search ?? "",
        category: sp.category ?? "ALL",
        categoryGroup: sp.categoryGroup,
        status: sp.status,
        from: sp.from,
        to: sp.to,
        sortBy,
        sortDir,
        page
      }}
      autoOpenIntake={sp.new === "1"}
      overviewStats={overviewStats}
      categoryDistribution={categoryDistribution}
      revenueTrend={revenueTrend}
    />
  );
}
