import { listOpposingParties } from "@/server/opposing-parties/actions";
import { OpposingPartiesView } from "./_components/opposing-parties-view";
import { PartyType } from "@prisma/client";

type Props = {
  searchParams: Promise<{
    search?: string;
    partyType?: PartyType;
    page?: string;
  }>;
};

export default async function OpposingPartiesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const initialData = await listOpposingParties({
    search: sp.search,
    partyType: sp.partyType,
    page: sp.page ? Number(sp.page) : 1,
    pageSize: 50
  });

  return (
    <OpposingPartiesView
      initialData={initialData}
      initialFilters={{
        search: sp.search ?? "",
        partyType: sp.partyType ?? "ALL"
      }}
    />
  );
}
