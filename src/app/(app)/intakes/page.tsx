import { listIntakes } from "@/server/intakes/actions";
import { listClients } from "@/server/clients/actions";
import { IntakesView } from "./_components/intakes-view";
import type { IntakeStatus } from "@prisma/client";

type Props = {
  searchParams: { search?: string; status?: IntakeStatus };
};

export default async function IntakesPage({ searchParams }: Props) {
  const [intakes, clients] = await Promise.all([
    listIntakes({ search: searchParams.search, status: searchParams.status }),
    listClients({ pageSize: 100 })
  ]);

  return (
    <IntakesView
      initialData={intakes}
      clientOptions={clients.items.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
      initialFilters={{
        search: searchParams.search ?? "",
        status: searchParams.status ?? "ALL"
      }}
    />
  );
}
