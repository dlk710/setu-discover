import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildClientPortalSummary, buildCuratorProposals } from "@/lib/phase4-intelligence";
import { listClients, listEvents, listSources } from "@/lib/repository";

export async function GET(request: Request) {
  const { response } = await requireUser();
  if (response) return response;

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const [clients, events, sources] = await Promise.all([
    listClients(),
    listEvents(),
    listSources(),
  ]);
  const client = clients.find((item) => item.id === clientId) ?? clients[0] ?? null;

  return NextResponse.json({
    portal: buildClientPortalSummary(client, events),
    curatorProposals: buildCuratorProposals(clients, sources, events),
    capabilities: [
      "Hybrid heuristic plus semantic opportunity matching",
      "Client-facing criteria coverage preview",
      "Human-reviewed source curator proposals",
      "SETU evidence export packet",
      "Local Postgres system of record with agent and ingestion audit trails",
    ],
  });
}
