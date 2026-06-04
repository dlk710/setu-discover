import { Annotation, END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { rankMatches } from "@/lib/matching";
import {
  cleanHtml,
  extractOpportunities,
  guardedFetch,
  lowConfidenceThreshold,
  normalizeCategory,
  normalizeDomain,
  registryPages,
  ruleBasedExtract,
  sha256,
  stableEventId,
  type ExtractedOpportunity,
  type RegistryPage,
} from "@/lib/phase2-ingestion";
import {
  createAgentAlert,
  createAgentRun,
  createAgentStep,
  createReviewItem,
  listClients,
  listEvents,
  logRecommendation,
  purgeExpiredEvents,
  updateAgentRun,
  updateSourcePageHash,
  upsertAgentDeadLetter,
  upsertEvent,
  upsertSourcePage,
} from "@/lib/repository";

type AgentPage = RegistryPage & {
  discovery_reason: string;
};

type FetchedPage = AgentPage & {
  html: string;
  content_hash: string;
  changed: boolean;
  attempts: number;
};

type AgentOpportunity = {
  page: AgentPage;
  content_hash: string;
  opportunity: ExtractedOpportunity;
  review_reason: string | null;
};

type AgentCounters = {
  pagesDiscovered: number;
  pagesChecked: number;
  eventsUpserted: number;
  interruptions: number;
  retries: number;
  alerts: number;
  deadLetters: number;
};

const AgentState = Annotation.Root({
  runId: Annotation<string>,
  mode: Annotation<string>,
  pages: Annotation<AgentPage[]>({ value: (_left, right) => right, default: () => [] }),
  fetched: Annotation<FetchedPage[]>({ value: (_left, right) => right, default: () => [] }),
  opportunities: Annotation<AgentOpportunity[]>({ value: (_left, right) => right, default: () => [] }),
  approved: Annotation<AgentOpportunity[]>({ value: (_left, right) => right, default: () => [] }),
  review: Annotation<AgentOpportunity[]>({ value: (_left, right) => right, default: () => [] }),
  counters: Annotation<AgentCounters>({
    value: (_left, right) => right,
    default: () => ({
      pagesDiscovered: 0,
      pagesChecked: 0,
      eventsUpserted: 0,
      interruptions: 0,
      retries: 0,
      alerts: 0,
      deadLetters: 0,
    }),
  }),
  logs: Annotation<string[]>({
    value: (left, right) => left.concat(right),
    default: () => [],
  }),
});

type AgentStateType = typeof AgentState.State;

function sameDomainOrFixture(url: string, page: RegistryPage) {
  try {
    const parsed = new URL(url);
    const canonical = normalizeDomain(page.canonical_domain);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const localFixture = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) &&
      parsed.pathname.startsWith("/phase2-fixtures/");
    return localFixture || host === canonical || host.endsWith(`.${canonical}`);
  } catch {
    return false;
  }
}

function looksLikeOpportunityUrl(url: string) {
  return /award|cfp|judge|review|profile|opportunit|fellow|speaker|summit|grant|press|apply|breaking/i.test(url);
}

function discoverLinks(html: string, page: RegistryPage) {
  const links = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)]
    .map((match) => {
      try {
        return new URL(match[1], page.url).toString();
      } catch {
        return "";
      }
    })
    .filter((url) => url && sameDomainOrFixture(url, page) && looksLikeOpportunityUrl(url));

  return [...new Set(links)].filter((url) => url !== page.url);
}

async function trace(
  runId: string,
  nodeName: string,
  outputSummary: string,
  decision: Record<string, unknown> = {},
  inputSummary = "",
) {
  await createAgentStep({
    runId,
    nodeName,
    inputSummary,
    outputSummary,
    decision,
  });
}

function mergeCounters(current: AgentCounters, patch: Partial<AgentCounters>): AgentCounters {
  return { ...current, ...patch };
}

async function scoutNode(state: AgentStateType) {
  const seeds = await registryPages();
  const discovered: AgentPage[] = seeds.map((page) => ({
    ...page,
    discovery_reason: "registry seed",
  }));
  let newPages = 0;

  for (const seed of seeds) {
    const fetched = await guardedFetch(seed);
    if (!fetched.guard.allowed) {
      await upsertAgentDeadLetter({
        runId: state.runId,
        sourceId: seed.source_id,
        pageUrl: seed.url,
        failureKey: sha256(`scout:${seed.source_id}:${seed.url}`),
        reason: "Scout fetch blocked",
        lastError: fetched.guard.reason,
      });
      continue;
    }

    for (const url of discoverLinks(fetched.html, seed)) {
      const page = await upsertSourcePage({
        source_id: seed.source_id,
        url,
        label: "Agent discovered",
        status: "active",
        discovered_by: "phase3-agent",
      });
      discovered.push({
        ...page,
        source_name: seed.source_name,
        canonical_domain: seed.canonical_domain,
        credibility_tier: seed.credibility_tier,
        refresh_enabled: seed.refresh_enabled,
        source_status: seed.source_status,
        discovery_reason: "scout link",
      });
      newPages += 1;
    }
  }

  const unique = Array.from(new Map(discovered.map((page) => [page.url, page])).values());
  await trace(state.runId, "scout", `${unique.length} candidate pages`, {
    registrySeeds: seeds.length,
    discoveredPages: newPages,
  });

  return {
    pages: unique,
    counters: mergeCounters(state.counters, {
      pagesDiscovered: newPages,
      deadLetters: state.counters.deadLetters,
    }),
    logs: [`Scout selected ${unique.length} in-domain pages.`],
  };
}

async function fetchNode(state: AgentStateType) {
  const fetchedPages: FetchedPage[] = [];
  let retries = 0;
  let deadLetters = state.counters.deadLetters;

  for (const page of state.pages) {
    let lastError = "";
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const fetched = await guardedFetch(page);
      if (fetched.guard.allowed) {
        const contentHash = sha256(cleanHtml(fetched.html));
        const changed = contentHash !== page.last_content_hash;
        await updateSourcePageHash(page.id, contentHash, changed);
        fetchedPages.push({
          ...page,
          html: fetched.html,
          content_hash: contentHash,
          changed,
          attempts: attempt,
        });
        retries += attempt - 1;
        lastError = "";
        break;
      }
      lastError = fetched.guard.reason;
    }

    if (lastError) {
      deadLetters += 1;
      await upsertAgentDeadLetter({
        runId: state.runId,
        sourceId: page.source_id,
        pageUrl: page.url,
        failureKey: sha256(`fetch:${page.source_id}:${page.url}`),
        reason: "Fetch failed after retry",
        lastError,
      });
    }
  }

  await trace(state.runId, "fetch", `${fetchedPages.length} pages fetched`, {
    attempted: state.pages.length,
    retries,
    deadLetters,
  });

  return {
    fetched: fetchedPages,
    counters: mergeCounters(state.counters, {
      pagesChecked: fetchedPages.length,
      retries,
      deadLetters,
    }),
    logs: [`Fetched ${fetchedPages.length} pages with ${retries} retry attempts.`],
  };
}

async function modelTieredExtract(html: string) {
  const local = ruleBasedExtract(html);
  const shouldEscalate =
    process.env.PHASE3_OPENAI_ESCALATION === "true" &&
    local.some((item) => item.confidence < lowConfidenceThreshold);

  if (!shouldEscalate) return { opportunities: local, provider: "local-rule" };

  try {
    const escalated = await extractOpportunities(html);
    return {
      opportunities: escalated.length ? escalated : local,
      provider: escalated.length ? "openai-escalation" : "local-rule",
    };
  } catch {
    return { opportunities: local, provider: "local-rule" };
  }
}

async function extractNode(state: AgentStateType) {
  const extracted: AgentOpportunity[] = [];
  let alerts = state.counters.alerts;

  for (const page of state.fetched) {
    const result = await modelTieredExtract(page.html);
    if (!result.opportunities.length) {
      alerts += 1;
      await createAgentAlert({
        runId: state.runId,
        sourceId: page.source_id,
        alertType: "zero_candidates",
        severity: "high",
        message: `${page.source_name} returned zero candidates from ${page.url}. Possible layout change.`,
      });
      continue;
    }

    for (const opportunity of result.opportunities) {
      extracted.push({
        page,
        content_hash: page.content_hash,
        opportunity,
        review_reason: null,
      });
    }
  }

  await trace(state.runId, "extractor", `${extracted.length} opportunities extracted`, {
    fetchedPages: state.fetched.length,
    alerts,
  });

  return {
    opportunities: extracted,
    counters: mergeCounters(state.counters, { alerts }),
    logs: [`Extractor produced ${extracted.length} structured opportunities.`],
  };
}

async function classifyNode(state: AgentStateType) {
  const reviewed = state.opportunities.map((item) => {
    const opportunity = {
      ...item.opportunity,
      category: normalizeCategory(item.opportunity.category),
      actionability: Math.max(1, Math.min(5, Number(item.opportunity.actionability || 3))),
      confidence: Number(item.opportunity.confidence || 0.3),
    };
    const payToPlay = Number(opportunity.feeAmount ?? 0) > 0 && item.page.credibility_tier === 3;
    const lowConfidence = opportunity.confidence < lowConfidenceThreshold;
    const reviewReason = lowConfidence
      ? "Low extraction confidence"
      : payToPlay
        ? "Pay-to-play rule triggered"
        : null;

    return {
      ...item,
      opportunity,
      review_reason: reviewReason,
    };
  });

  const approved = reviewed.filter((item) => !item.review_reason);
  const review = reviewed.filter((item) => item.review_reason);

  await trace(state.runId, "classifier", `${approved.length} approved, ${review.length} interrupted`, {
    total: reviewed.length,
    lowConfidenceThreshold,
  });

  return {
    opportunities: reviewed,
    approved,
    review,
    counters: mergeCounters(state.counters, { interruptions: review.length }),
    logs: [`Classifier routed ${review.length} opportunities to human review.`],
  };
}

async function reviewInterruptNode(state: AgentStateType) {
  for (const item of state.review) {
    await createReviewItem({
      runId: null,
      sourceId: item.page.source_id,
      pageUrl: item.page.url,
      title: item.opportunity.title,
      reason: item.review_reason ?? "Human review requested",
      confidence: item.opportunity.confidence,
      payload: {
        phase: 3,
        agentRunId: state.runId,
        sourceId: item.page.source_id,
        sourceName: item.page.source_name,
        credibilityTier: item.page.credibility_tier,
        pageUrl: item.page.url,
        contentHash: item.content_hash,
        opportunity: item.opportunity,
      },
    });
  }

  await trace(state.runId, "review_interrupt", `${state.review.length} review items queued`, {
    queued: state.review.length,
  });

  return {
    logs: [`Queued ${state.review.length} portal-backed review interrupts.`],
  };
}

async function persistNode(state: AgentStateType) {
  let eventsUpserted = 0;

  for (const item of state.approved) {
    const eventId = stableEventId(
      item.page.source_id,
      item.opportunity.title,
      item.opportunity.sourceUrl || item.page.url,
    );
    await upsertEvent(
      {
        title: item.opportunity.title,
        category: normalizeCategory(item.opportunity.category),
        fee_amount: item.opportunity.feeAmount,
        fee_currency: item.opportunity.feeCurrency || "USD",
        fee_purpose: item.opportunity.feePurpose,
        credibility_tier: item.page.credibility_tier,
        manual_status: "active",
        deadline: item.opportunity.deadline,
        criteria_tags: item.opportunity.criteriaTags,
        keywords: item.opportunity.keywords,
        field: item.opportunity.field,
        location: item.opportunity.location,
        apply_url: item.opportunity.applyUrl,
        source_url: item.opportunity.sourceUrl || item.page.url,
        source_id: item.page.source_id,
        summary: item.opportunity.summary,
        actionability: item.opportunity.actionability,
        extraction_confidence: item.opportunity.confidence,
        last_seen_at: new Date().toISOString(),
        content_hash: item.content_hash,
        notes: `Phase 3 agentic discovery from ${item.page.source_name}.`,
        archived: false,
      },
      eventId,
    );
    eventsUpserted += 1;
  }

  const expiredPurged = await purgeExpiredEvents();
  const [clients, events] = await Promise.all([listClients(), listEvents()]);
  await Promise.all(
    clients.flatMap((client) =>
      rankMatches(client, events)
        .slice(0, 8)
        .map((match) => logRecommendation(client.id, match.event.id, match.score, match.breakdown)),
    ),
  );

  await trace(state.runId, "persist", `${eventsUpserted} events upserted`, {
    expiredPurged,
    clientsRefreshed: clients.length,
  });

  return {
    counters: mergeCounters(state.counters, { eventsUpserted }),
    logs: [`Persisted ${eventsUpserted} records and recomputed matches.`],
  };
}

function buildAgentGraph() {
  return new StateGraph(AgentState)
    .addNode("scout", scoutNode)
    .addNode("fetch", fetchNode)
    .addNode("extractor", extractNode)
    .addNode("classifier", classifyNode)
    .addNode("review_interrupt", reviewInterruptNode)
    .addNode("persist", persistNode)
    .addEdge(START, "scout")
    .addEdge("scout", "fetch")
    .addEdge("fetch", "extractor")
    .addEdge("extractor", "classifier")
    .addEdge("classifier", "review_interrupt")
    .addEdge("review_interrupt", "persist")
    .addEdge("persist", END)
    .compile({
      checkpointer: new MemorySaver(),
      name: "setu-discover-phase3-agent",
    });
}

export async function runPhase3Agent(mode = "manual") {
  const run = await createAgentRun(mode);
  const graph = buildAgentGraph();

  try {
    const result = await graph.invoke(
      {
        runId: run.id,
        mode,
      },
      {
        configurable: {
          thread_id: run.id,
        },
      },
    );

    return updateAgentRun(run.id, {
      status: "completed",
      checkpoint: result as Record<string, unknown>,
      pages_discovered: result.counters.pagesDiscovered,
      pages_checked: result.counters.pagesChecked,
      events_upserted: result.counters.eventsUpserted,
      interruptions: result.counters.interruptions,
      retries: result.counters.retries,
      notes: `Phase 3 agent checked ${result.counters.pagesChecked} pages, queued ${result.counters.interruptions} review interrupts, and upserted ${result.counters.eventsUpserted} events.`,
    });
  } catch (error) {
    await createAgentStep({
      runId: run.id,
      nodeName: "agent_error",
      status: "failed",
      outputSummary: error instanceof Error ? error.message : String(error),
    });
    return updateAgentRun(run.id, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
