import { listPotentialClients } from "@/server/potential-clients/actions";
import { PotentialClientsView } from "./_components/potential-clients-view";

type Props = {
  searchParams: Promise<{ search?: string; page?: string }>;
};

export default async function PotentialClientsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const initialData = await listPotentialClients({
    search: sp.search,
    page: sp.page ? Number(sp.page) : 1
  });

  return (
    <PotentialClientsView
      initialData={initialData}
      initialFilters={{ search: sp.search ?? "" }}
    />
  );
}
