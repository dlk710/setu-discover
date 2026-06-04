# SETU - DISCOVER Technical Architecture

## Stack

- Next.js app router
- React client components
- PostgreSQL 16
- `pg` for database access
- LangGraph JS for Phase 3 orchestration
- Nodemailer for SMTP email
- OpenAI Responses API optional for structured extraction
- Docker Compose for local app/database hosting

## Local Services

Default local PostgreSQL:

```text
postgres://marga:marga@localhost:5435/marga
```

Default app URL:

```text
http://localhost:3004
```

## Database Spine

The stable record spine is `events`.

Core tables:

- `users`
- `sessions`
- `sources`
- `source_pages`
- `denylisted_domains`
- `events`
- `clients`
- `recommendations`
- `applications`
- `email_logs`
- `ingestion_runs`
- `ingestion_items`
- `review_items`
- `agent_runs`
- `agent_steps`
- `agent_dead_letters`
- `agent_alerts`

## Phase 2 Pipeline

Main module:

```text
src/lib/phase2-ingestion.ts
```

Master registry data:

```text
data/source-registry.json
```

The JSON registry is normalized from the EB-1A workbook and imported by `scripts/setup-db.mjs`. It stores source organization, source category, EB-1A criteria tags, typical fee, canonical domain, seed URL, credibility tier, and workbook rank.

Primary functions:

- `registryPages()`
- `guardedFetch()`
- `cleanHtml()`
- `ruleBasedExtract()`
- `extractOpportunities()`
- `validateClientOpportunity()`
- `runPhase2Ingestion()`

`validateClientOpportunity()` is the final persistence gate. A candidate must have a title, summary, public source URL, public apply/client URL, canonical-domain alignment, an application/nomination/submission-style action signal, and a reachable final link. Failed candidates are not written to active inventory.

Run endpoint:

```text
POST /api/ingestion/run
```

Local script:

```bash
npm run phase2:run
```

## Phase 3 Agent

Main module:

```text
src/lib/phase3-agent.ts
```

Graph nodes:

- `scout`: reads active registry pages, fetches seeds, discovers in-domain opportunity links, and upserts discovered `source_pages`.
- `fetch`: performs guarded fetch with retry and dead-letter handling.
- `extractor`: extracts structured opportunities using local rule extraction first.
- `classifier`: normalizes category, verifies client-facing links, clamps actionability, and applies confidence/policy routing.
- `review_interrupt`: writes human-review items into `review_items`.
- `persist`: writes approved opportunities into `events`, purges expired records, and recomputes recommendations.

Run endpoint:

```text
POST /api/agent/run
```

Local script:

```bash
npm run phase3:run
```

## Human Review Rejoin Flow

Review endpoint:

```text
PUT /api/review-items/[id]
```

Supported statuses:

- `approved`: upserts Phase 3 payload into `events`.
- `rejected`: closes item and archives linked event if one exists.
- `open`: reopens item.

## Environment Variables

Required:

```text
DATABASE_URL
SESSION_SECRET
PHASE2_RUN_TOKEN
SETU_DISCOVER_URL
```

Optional:

```text
OPENAI_API_KEY
OPENAI_EXTRACTION_MODEL
PHASE3_OPENAI_ESCALATION
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
```

## Verification Commands

```bash
npm run db:setup
npm run lint
npm run build
npm run phase2:run
npm run phase3:run
```

## Git Hygiene

Do not commit:

- `.env`
- `.env.local`
- `.next`
- `node_modules`
- runtime screenshots
- local database volumes

The committed `.env.example` contains placeholders only.
