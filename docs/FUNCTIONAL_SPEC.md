# Discover Functional Specification

## Purpose

Discover helps the Discover team find, qualify, match, review, and send profile-building opportunities for clients. The product is local-first, PostgreSQL-backed, and organized around one durable inventory spine: the `events` table.

## Users

- Admin: manages source registry, inventory, clients, ingestion, agent runs, review queue, and outbound emails.
- Team member: reviews opportunities, matches clients, composes email outreach, and monitors runs.
- Client: not yet a separate public login user; Phase 4 includes an internal client portal preview that shows what a client-facing experience would display.

## Phase Coverage

### Phase 1: Manual Operating System

Phase 1 gives the team a working local portal:

- Login for admin/team users.
- Inventory CRUD for opportunities.
- Inventory list visibility for the date an opportunity was added.
- Client profile CRUD.
- Client engagement badge sourced from Setu Finance.
- Deterministic status from deadline and archive state.
- Transparent matching score by criteria gap, credibility, keyword fit, actionability, and location.
- Email compose/send flow with local logging fallback when SMTP is absent.
- Email and recommendation pushes fail closed unless the selected client is Finance-active with a fresh engagement timestamp.
- PostgreSQL persistence.

### Phase 2: Automated Ingestion

Phase 2 adds deterministic source ingestion:

- Admin-managed source registry with canonical domain, credibility tier, seed URL, status, refresh flag, and notes.
- Workbook-backed EB-1A master registry with organization, registry category, criteria tags, typical fee, and source rank.
- Source page monitor with fetched/changed timestamps.
- Domain-guarded fetch against allowlisted canonical domains.
- Content hash change detection.
- Structured opportunity extraction.
- Client-link verification that requires a public, reachable source/apply URL on the registry source domain before an extracted record can become active inventory.
- Run reports with pages checked, changed pages, upserts, expired purges, and review counts.
- Low-confidence review queue.
- Local scheduled run support.

### Phase 3: Agentic Discovery

Phase 3 adds constrained agentic discovery:

- LangGraph orchestration with explicit graph nodes.
- Scout node finds new in-domain opportunity pages from seed pages.
- Guarded fetch node retries and dead-letters repeated failures.
- Extractor node uses local rule extraction first.
- OpenAI escalation when an API key is present and the local extractor finds no candidates; optional low-confidence escalation with `PHASE3_OPENAI_ESCALATION=true`.
- Classifier node applies category normalization, client-link verification, confidence threshold, and pay-to-play review routing.
- Review interrupt node writes uncertain records into the portal review queue.
- Persist node writes approved/high-confidence records to `events` and refreshes matches.
- Agent observability tab shows run history, graph traces, alerts, and dead letters.

### Phase 4: Intelligence And Scale

Phase 4 closes the operating loop:

- Hybrid matching adds deterministic semantic text similarity to the existing transparent heuristic score.
- Phase 4 workspace shows a client portal preview with criteria coverage, open gaps, ranked recommendations, and next best action.
- Client portal recommendations are hidden unless the client is Finance-active with fresh status.
- Curator proposals suggest new canonical sources based on client demand, criteria gaps, source coverage, and credibility tier.
- Admins can add a curator proposal into the source registry for refresh and monitoring.
- Evidence export endpoint creates an evidence packet JSON for a selected client and opportunity.
- DB setup creates vetted standing opportunities from direct-action EB-1A registry rows and keeps demo fixtures archived.

## Key Workflows

### Manual Opportunity Entry

1. Admin opens Inventory.
2. Admin scans title, category, fee, credibility, status, added date, deadline, source, and actions.
3. Admin creates or edits an opportunity.
4. Required data includes title, category, credibility, summary, and actionability.
5. Optional data includes fee, source/apply links, criteria tags, keywords, field, and location.
6. Saved opportunity becomes eligible for matching.

### Client Matching

1. Admin opens Match.
2. Admin selects a client.
3. System checks the client's Finance engagement status.
4. Dormant, inactive, unknown, or stale clients receive no new opportunity list.
5. Active clients receive ranked active opportunities using hybrid deterministic scoring.
6. Admin reviews score evidence and sends email.
7. Email is logged whether SMTP sends it or local fallback simulates it.

### Finance Engagement Sync

1. Scheduler or operator runs `npm run finance:sync`.
2. Discover calls Finance `GET /api/integration/engagement-status` with `X-Api-Key`.
3. Discover matches customers by normalized email and optional Finance aliases.
4. Discover updates only `engagement_status` and `engagement_as_of` on matching clients.
5. Unmatched clients remain `unknown`.
6. Sync outcome is logged in `integration_sync_log`.

### Phase 4 Client Portal Preview

1. Admin opens Phase 4.
2. Admin selects a client.
3. System shows the client's covered criteria and open criteria gaps.
4. System shows ranked client-ready recommendations.
5. Admin can open a Discover evidence export JSON for any export-ready recommendation.

### Phase 4 Curator Proposal

1. Admin opens Phase 4.
2. System scores source proposals from the candidate bank.
3. Proposal reasons show client demand, criteria gaps, category supply gaps, and tier.
4. Admin clicks Add source.
5. Proposal becomes an active source registry record and source page for future refreshes.

### Evidence Export

1. Admin selects a client-ready opportunity.
2. System generates a JSON packet with client profile, opportunity source/apply links, criteria tags, ranking evidence, and operating next steps.
3. Evidence workflows can consume the packet as a structured starting point after the client completes the opportunity.

### Phase 2 Ingestion

1. Admin opens Ingestion.
2. Admin clicks Run Now or runs `npm run phase2:run`.
3. System fetches active source pages.
4. Unchanged content is skipped.
5. Changed content is extracted.
6. Candidate records must include a reachable client-facing link before inventory upsert.
7. Broad pages, missing links, blocked links, and low-confidence records go to Review or stay out of active inventory.
8. Expired events are archived and matches recompute.

### Phase 3 Agent Run

1. Admin opens Agent.
2. Admin clicks Run Agent or runs `npm run phase3:run`.
3. Scout discovers in-domain opportunity links.
4. Fetch node validates each URL with the same guardrails as Phase 2.
5. Extractor parses candidate pages.
6. Classifier approves high-confidence records and routes uncertain records to Review.
7. Persist node writes approved records into Inventory.
8. Admin reviews traces, alerts, dead letters, and review interrupts.

### Review Queue Approval

1. Admin opens Review.
2. Admin inspects low-confidence or policy-flagged opportunities.
3. Approve writes a Phase 3 review payload into Inventory.
4. Reject closes the review item and archives any linked event.
5. Reopen returns a previously closed item to the open review queue.

## Acceptance Criteria

- Local app starts on `http://localhost:3004`.
- PostgreSQL is the persistence layer.
- Inventory and client data persist across restarts.
- Inventory list shows added date for each opportunity.
- Source registry setup imports the 45 workbook-backed EB-1A sources.
- Phase 2 run can complete against the real source registry without saving broad source pages as active opportunities.
- Phase 3 run can discover in-domain pages beyond the seed registry.
- Phase 3 run creates graph traces.
- Low-confidence Phase 3 records enter the review queue.
- Review approval writes an opportunity into Inventory.
- Phase 4 hybrid match score includes semantic fit.
- Phase 4 client portal preview renders coverage, gaps, top recommendations, and export status.
- Evidence export endpoint returns an evidence packet JSON for valid client/opportunity pairs.
- Finance sync updates matched client engagement status by normalized email.
- Unmatched clients remain `unknown`.
- Dormant, inactive, unknown, or stale clients cannot receive email pushes.
- Active clients with fresh status can receive email pushes.
- Admin UI shows engagement status badges only, with no Finance amount/payment fields.
- Curator proposals can be added into the source registry.
- Setup imports 20 vetted standing opportunities and keeps old fixture records inactive.
- Lint and production build pass.
