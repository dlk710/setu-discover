import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { normalizeCategory, stableEventId } from "@/lib/phase2-ingestion";
import { archiveEvent, updateReviewItemStatus, upsertEvent } from "@/lib/repository";
import type { ReviewItem } from "@/lib/types";

type ReviewPayload = {
  phase?: number;
  sourceId?: string;
  sourceName?: string;
  credibilityTier?: number;
  pageUrl?: string;
  contentHash?: string;
  opportunity?: {
    title?: string;
    category?: string;
    feeAmount?: number | null;
    feeCurrency?: string;
    feePurpose?: string;
    deadline?: string | null;
    location?: string;
    field?: string;
    criteriaTags?: string[];
    keywords?: string[];
    applyUrl?: string;
    sourceUrl?: string;
    summary?: string;
    actionability?: number;
    confidence?: number;
  };
};

async function fetchReviewItem(id: string) {
  const rows = await query<ReviewItem>("SELECT * FROM review_items WHERE id = $1 LIMIT 1", [id]);
  return rows[0] ?? null;
}

async function approveReviewItem(item: ReviewItem) {
  const payload = item.payload as ReviewPayload;
  const opportunity = payload.opportunity;
  if (!opportunity?.title) return null;

  const sourceId = payload.sourceId ?? item.source_id ?? "";
  const sourceUrl = opportunity.sourceUrl || payload.pageUrl || item.page_url;
  const eventId = item.event_id ?? stableEventId(sourceId, opportunity.title, sourceUrl);

  return upsertEvent(
    {
      title: opportunity.title,
      category: normalizeCategory(opportunity.category ?? ""),
      fee_amount: opportunity.feeAmount ?? null,
      fee_currency: opportunity.feeCurrency || "USD",
      fee_purpose: opportunity.feePurpose ?? "",
      credibility_tier: payload.credibilityTier ?? 2,
      manual_status: "active",
      deadline: opportunity.deadline ?? null,
      criteria_tags: opportunity.criteriaTags ?? [],
      keywords: opportunity.keywords ?? [],
      field: opportunity.field ?? "",
      location: opportunity.location ?? "",
      apply_url: opportunity.applyUrl ?? "",
      source_url: sourceUrl,
      source_id: sourceId || null,
      summary: opportunity.summary ?? "",
      actionability: opportunity.actionability ?? 3,
      extraction_confidence: opportunity.confidence ?? null,
      last_seen_at: new Date().toISOString(),
      content_hash: payload.contentHash ?? null,
      notes: `Approved from Phase 3 review queue${payload.sourceName ? ` (${payload.sourceName})` : ""}.`,
      archived: false,
    },
    eventId,
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { response } = await requireUser();
  if (response) return response;
  const { id } = await context.params;
  const payload = await request.json();
  const status = String(payload.status ?? "open");
  const item = await fetchReviewItem(id);
  if (!item) return NextResponse.json({ error: "Review item not found" }, { status: 404 });

  let event = null;
  if (status === "approved") {
    event = await approveReviewItem(item);
  }

  if (status === "rejected" && item.event_id) {
    await archiveEvent(item.event_id);
  }

  const reviewItem = await updateReviewItemStatus(id, status);
  return NextResponse.json({ reviewItem, event });
}
