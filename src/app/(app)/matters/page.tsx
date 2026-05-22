import { listMatters } from "@/server/matters/actions";
import { listClients } from "@/server/clients/actions";
import { MattersView } from "./_components/matters-view";
import type { MatterCategory, MatterStatus } from "@prisma/client";

type Props = {
  searchParams: {
    search?: string;
    category?: MatterCategory;
    status?: MatterStatus;
    page?: string;
  };
};

export default async function MattersPage({ searchParams }: Props) {
  const [matters, clientsResponse] = await Promise.all([
    listMatters({
      search: searchParams.search,
      category: searchParams.category,
      status: searchParams.status,
      page: searchParams.page ? Number(searchParams.page) : 1
    }),
    // 一次拿前 100 客户作为新建抽屉的下拉数据
    listClients({ pageSize: 100 })
  ]);

  return (
    <MattersView
      initialData={matters}
      clientOptions={clientsResponse.items.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type
      }))}
      initialFilters={{
        search: searchParams.search ?? "",
        category: searchParams.category ?? "ALL",
        status: searchParams.status ?? "ALL"
      }}
    />
  );
}
