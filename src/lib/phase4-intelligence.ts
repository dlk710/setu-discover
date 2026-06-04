import curatorCandidates from "../../data/curator-candidates.json";
import { rankMatches } from "@/lib/matching";
import type { ClientRecord, EventRecord, MatchRecord, Source } from "@/lib/types";

type CuratorCandidate = {
  id: string;
  name: string;
  organization: string;
  source_category: string;
  criteria_tags: string[];
  typical_fee: string;
  canonical_domain: string;
  seed_url: string;
  credibility_tier: number;
  notes: string;
};

export type CuratorProposal = CuratorCandidate & {
  score: number;
  reasons: string[];
  sourcePayload: Record<string, unknown>;
};

export type ClientCoverageItem = {
  criterion: string;
  status: "covered" | "gap";
};

export type ClientPortalSummary = {
  client: ClientRecord | null;
  coverage: ClientCoverageItem[];
  gaps: string[];
  topMatches: MatchRecord[];
  exportReady: boolean;
  nextBestAction: string;
};

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function categoryKey(value: string) {
  const item = normalized(value);
  const aliases: Record<string, string> = {
    awards: "awards",
    "awards & nominations": "awards",
    press: "media",
    media: "media",
    "media & interview": "media",
    publications: "authorship",
    authorship: "authorship",
    memberships: "memberships",
    "memberships & fellowships": "memberships",
    exhibitions: "exhibitions",
    "exhibitions & showcases": "exhibitions",
    editorial: "leadership",
    "editorial / board / leadership": "leadership",
  };
  return aliases[item] ?? item;
}

function overlaps(left: string[], right: string[]) {
  const rightSet = new Set(right.map(normalized));
  return left.filter((item) => rightSet.has(normalized(item)));
}

export function buildClientPortalSummary(
  client: ClientRecord | null,
  events: EventRecord[],
): ClientPortalSummary {
  if (!client) {
    return {
      client: null,
      coverage: [],
      gaps: [],
      topMatches: [],
      exportReady: false,
      nextBestAction: "Add a client profile before opening the portal preview.",
    };
  }

  const coveredSet = new Set(client.covered_criteria.map(normalized));
  const coverage = client.target_criteria.map((criterion) => ({
    criterion,
    status: coveredSet.has(normalized(criterion)) ? "covered" as const : "gap" as const,
  }));
  const gaps = coverage.filter((item) => item.status === "gap").map((item) => item.criterion);
  const topMatches = rankMatches(client, events).slice(0, 5);

  return {
    client,
    coverage,
    gaps,
    topMatches,
    exportReady: topMatches.some((match) => Boolean(match.event.apply_url && match.event.source_url)),
    nextBestAction: topMatches.length
      ? "Review the highest hybrid match, email the client, then export the accepted evidence packet to SETU."
      : "Run ingestion or add a verified standing opportunity before sending client recommendations.",
  };
}

export function buildCuratorProposals(
  clients: ClientRecord[],
  sources: Source[],
  events: EventRecord[],
): CuratorProposal[] {
  const existingDomains = new Set(sources.map((source) => normalized(source.canonical_domain)));
  const activeCategories = new Set(
    events
      .filter((event) => !["Expired", "Inactive"].includes(event.derived_status))
      .map((event) => categoryKey(event.category)),
  );
  const clientGaps = clients.flatMap((client) => {
    const covered = new Set(client.covered_criteria.map(normalized));
    return client.target_criteria.filter((criterion) => !covered.has(normalized(criterion)));
  });
  const demandCategories = clients.flatMap((client) => client.preferred_categories.map(categoryKey));

  return (curatorCandidates as CuratorCandidate[])
    .filter((candidate) => !existingDomains.has(normalized(candidate.canonical_domain)))
    .map((candidate) => {
      const categoryDemand = demandCategories.filter((category) => category === categoryKey(candidate.source_category)).length;
      const criteriaDemand = overlaps(candidate.criteria_tags, clientGaps).length;
      const categorySupplyGap = activeCategories.has(categoryKey(candidate.source_category)) ? 0 : 1;
      const tierBonus = candidate.credibility_tier === 1 ? 12 : 8;
      const score = Math.min(100, categoryDemand * 16 + criteriaDemand * 14 + categorySupplyGap * 18 + tierBonus);
      const reasons = [
        categoryDemand ? `${categoryDemand} client category demand signal${categoryDemand === 1 ? "" : "s"}` : "",
        criteriaDemand ? `${criteriaDemand} open criteria gap match${criteriaDemand === 1 ? "" : "es"}` : "",
        categorySupplyGap ? `no active inventory in ${candidate.source_category}` : "",
        `Tier ${candidate.credibility_tier} source`,
      ].filter(Boolean);

      return {
        ...candidate,
        score,
        reasons,
        sourcePayload: {
          name: candidate.name,
          organization: candidate.organization,
          source_category: candidate.source_category,
          criteria_tags: candidate.criteria_tags,
          typical_fee: candidate.typical_fee,
          canonical_domain: candidate.canonical_domain,
          seed_url: candidate.seed_url,
          credibility_tier: candidate.credibility_tier,
          status: "active",
          refresh_enabled: true,
          notes: `Phase 4 curator proposal. ${candidate.notes}`,
        },
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
}

export function buildSetuExport(client: ClientRecord, event: EventRecord, match: MatchRecord) {
  return {
    export_type: "setu_discover_evidence_packet",
    generated_at: new Date().toISOString(),
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      field: client.field,
      location: client.location,
      target_criteria: client.target_criteria,
      covered_criteria: client.covered_criteria,
    },
    opportunity: {
      id: event.id,
      title: event.title,
      category: event.category,
      source_name: event.source_name,
      source_url: event.source_url,
      apply_url: event.apply_url,
      deadline: event.deadline,
      credibility_tier: event.credibility_tier,
      fee_amount: event.fee_amount,
      fee_currency: event.fee_currency,
      fee_purpose: event.fee_purpose,
      summary: event.summary,
    },
    kazarian_mapping: {
      criteria_tags: event.criteria_tags,
      gap_criteria_supported: match.breakdown.missingCriteria,
      evidence_use: "Profile-building opportunity for future petition evidence after completion.",
    },
    ranking_evidence: {
      score: match.score,
      breakdown: match.breakdown,
      matched_keywords: match.breakdown.matchedKeywords,
      flags: match.breakdown.flags,
    },
    operating_next_steps: [
      "Confirm current eligibility and submission cycle on the source site.",
      "Send client recommendation from SETU - DISCOVER.",
      "Track application outcome.",
      "After completion, attach proof artifacts to the SETU petition record.",
    ],
  };
}
