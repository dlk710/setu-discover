import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendTeamEmail } from "@/lib/email";
import { logEmail, logRecommendation } from "@/lib/repository";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const payload = await request.json();
  const clientId = String(payload.clientId ?? "");
  const eventId = payload.eventId ? String(payload.eventId) : null;
  const toEmail = String(payload.toEmail ?? "");
  const subject = String(payload.subject ?? "");
  const body = String(payload.body ?? "");

  if (!clientId || !toEmail || !subject || !body) {
    return NextResponse.json({ error: "Missing email fields" }, { status: 400 });
  }

  const sent = await sendTeamEmail({ to: toEmail, subject, body });
  const email = await logEmail({
    clientId,
    eventId,
    toEmail,
    subject,
    body,
    providerStatus: sent.status,
    providerMessageId: sent.messageId,
    sentBy: user.id,
  });

  if (eventId && payload.breakdown && typeof payload.score === "number") {
    await logRecommendation(clientId, eventId, payload.score, payload.breakdown);
  }

  return NextResponse.json({ email, status: sent.status });
}
