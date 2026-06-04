# SETU - DISCOVER

Local SETU profile-discovery portal for operating opportunity inventory, client profiles, canonical source ingestion, agentic discovery, transparent matching, and email-out logging.

## Run locally with Docker

```bash
docker compose up --build
```

Open `http://localhost:3004`.

Demo users:

- `admin@marga.local` / `marga123`
- `teammate@marga.local` / `marga123`

## Run locally without Docker

Start Postgres and set `DATABASE_URL`, then:

```bash
npm install
npm run db:setup
npm run dev
```

If SMTP variables are empty, sent email is recorded as `simulated` so the workflow can still be reviewed locally.

## Phase 2 local deployment

Phase 2 adds source registry management, guarded page fetches, content hash change detection, structured opportunity extraction, run reports, and a review queue.

Set a local run token in `.env.local`:

```bash
PHASE2_RUN_TOKEN=replace-this-local-phase2-token
SETU_DISCOVER_URL=http://localhost:3004
```

Run one ingestion pass while the app is running:

```bash
npm run phase2:run
```

Keep a local daily scheduler open in a separate terminal:

```bash
npm run phase2:schedule
```

`OPENAI_API_KEY` is optional. When it is set, Phase 2 uses structured-output extraction; when it is absent, the local rule extractor handles the seeded review fixtures.

The master EB-1A source list is normalized into `data/source-registry.json` from the provided workbook. `npm run db:setup` imports those 45 sources into PostgreSQL and archives the older local fixture opportunities. Refreshed records are not saved to active inventory unless they include a public, reachable client-facing source/apply link on the registry source domain.

## Phase 3 local deployment

Phase 3 adds constrained LangGraph orchestration with a scout node, guarded fetch node, extractor, classifier, portal-backed review interrupt, persistence node, run traces, alerts, and dead letters.

Run one agentic discovery pass while the app is running:

```bash
npm run phase3:run
```

The local default uses the rule extractor first, then escalates to OpenAI when an API key is present and the local extractor finds no candidates. Phase 3 uses the same client-facing link verification before a discovered record can be persisted.

## Documentation

- [Functional specification](docs/FUNCTIONAL_SPEC.md)
- [Nonfunctional requirements](docs/NON_FUNCTIONAL_REQUIREMENTS.md)
- [Nontechnical overview](docs/NON_TECHNICAL_OVERVIEW.md)
- [Technical architecture](docs/TECHNICAL_ARCHITECTURE.md)
