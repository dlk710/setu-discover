import type { ClientRecord, EventRecord, MatchBreakdown, MatchRecord } from "@/lib/types";

function clean(value: string) {
  return value.trim().toLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function overlap(left: string[], right: string[]) {
  const rightSet = new Set(unique(right));
  return unique(left).filter((item) => rightSet.has(item));
}

function hasLocationFit(clientLocation: string, eventLocation: string) {
  const client = clean(clientLocation);
  const event = clean(eventLocation);
  if (!client || !event) return 0.45;
  if (event.includes("remote") || event.includes("virtual")) return 1;
  if (client === event || event.includes(client) || client.includes(event)) return 1;
  const clientState = client.split(",").at(-1)?.trim();
  const eventState = event.split(",").at(-1)?.trim();
  return clientState && eventState && clientState === eventState ? 0.75 : 0.2;
}

export function scoreMatch(client: ClientRecord, event: EventRecord): MatchBreakdown {
  const target = client.target_criteria.filter(Boolean);
  const covered = new Set(unique(client.covered_criteria));
  const missing = target.filter((criterion) => !covered.has(clean(criterion)));
  const eventCriteria = new Set(unique(event.criteria_tags));
  const missingHits = missing.filter((criterion) => eventCriteria.has(clean(criterion)));

  const criterionGap = missing.length
    ? (missingHits.length / missing.length) * 42
    : overlap(target, event.criteria_tags).length
      ? 26
      : 10;

  const tierWeight = event.credibility_tier === 1 ? 1 : event.credibility_tier === 2 ? 0.78 : 0.48;
  const payToPlayPenalty =
    Number(event.fee_amount ?? 0) > 0 && event.credibility_tier === 3 ? 0.58 : 1;
  const credibility = 20 * tierWeight * payToPlayPenalty;

  const eventTerms = unique([
    ...event.keywords,
    event.title,
    event.field,
    event.summary,
    event.category,
  ]);
  const clientTerms = unique([...client.keywords, client.field, ...client.preferred_categories]);
  const matchedKeywords = clientTerms.filter((term) =>
    eventTerms.some((eventTerm) => eventTerm.includes(term) || term.includes(eventTerm)),
  );
  const keyword = clientTerms.length ? Math.min(18, (matchedKeywords.length / clientTerms.length) * 28) : 5;

  const actionability = (event.actionability / 5) * 12;
  const location = hasLocationFit(client.location, event.location) * 8;
  const categoryBoost = client.preferred_categories.includes(event.category) ? 4 : 0;
  const total = Math.min(100, criterionGap + credibility + keyword + actionability + location + categoryBoost);

  const flags = [];
  if (event.derived_status === "Closing") flags.push("deadline closing");
  if (event.derived_status === "Expired") flags.push("expired");
  if (Number(event.fee_amount ?? 0) > 0 && event.credibility_tier === 3) {
    flags.push("fee plus tier 3");
  }
  if (!event.apply_url) flags.push("missing apply link");

  return {
    criterionGap: Number(criterionGap.toFixed(1)),
    credibility: Number(credibility.toFixed(1)),
    keyword: Number(keyword.toFixed(1)),
    actionability: Number(actionability.toFixed(1)),
    location: Number((location + categoryBoost).toFixed(1)),
    total: Number(total.toFixed(1)),
    missingCriteria: missingHits,
    matchedKeywords,
    flags,
  };
}

export function rankMatches(client: ClientRecord, events: EventRecord[]): MatchRecord[] {
  return events
    .filter((event) => !["Expired", "Inactive"].includes(event.derived_status))
    .map((event) => {
      const breakdown = scoreMatch(client, event);
      return {
        event,
        score: breakdown.total,
        breakdown,
      };
    })
    .sort((left, right) => right.score - left.score);
}
