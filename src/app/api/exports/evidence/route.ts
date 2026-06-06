import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertPushable, ForbiddenError } from "@/lib/engagement";
import { rankMatches } from "@/lib/matching";
import { buildEvidenceExport } from "@/lib/phase4-intelligence";
import { listClients, listEvents } from "@/lib/repository";

export async function GET(request: Request) {
  const { response } = await requireUser();
  if (response) return response;

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const eventId = url.searchParams.get("eventId");
  const [clients, events] = await Promise.all([listClients(), listEvents()]);
  const client = clients.find((item) => item.id === clientId);
  const event = events.find((item) => item.id === eventId);

  if (!client || !event) {
    return NextResponse.json({ error: "Client or opportunity not found" }, { status: 404 });
  }

  try {
    assertPushable(client);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const match = rankMatches(client, events).find((item) => item.event.id === event.id);
  if (!match) {
    return NextResponse.json({ error: "Opportunity is not export-ready for this client" }, { status: 400 });
  }

  return NextResponse.json(buildEvidenceExport(client, event, match), {
    headers: {
      "Content-Disposition": `attachment; filename="discover-evidence-${client.id}-${event.id}.json"`,
    },
  });
}
