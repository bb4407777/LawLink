import { listClients } from "@/server/clients/actions";
import { ClientsView } from "./_components/clients-view";

type Props = {
  searchParams: Promise<{
    search?: string;
    type?: "INDIVIDUAL" | "COMPANY" | "ORGANIZATION";
    page?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const initialData = await listClients({
    search: sp.search,
    type: sp.type,
    page: sp.page ? Number(sp.page) : 1,
    pageSize: 50
  });

  return (
    <ClientsView
      initialData={initialData}
      initialFilters={{
        search: sp.search ?? "",
        type: sp.type ?? "ALL"
      }}
    />
  );
}
