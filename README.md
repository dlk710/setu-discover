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

## Phase 3 local deployment

Phase 3 adds constrained LangGraph orchestration with a scout node, guarded fetch node, extractor, classifier, portal-backed review interrupt, persistence node, run traces, alerts, and dead letters.

Run one agentic discovery pass while the app is running:

```bash
npm run phase3:run
```

The local default is deterministic and uses the rule extractor first. Set `PHASE3_OPENAI_ESCALATION=true` to allow OpenAI escalation for low-confidence Phase 3 extractions.

## Documentation

- [Functional specification](docs/FUNCTIONAL_SPEC.md)
- [Nonfunctional requirements](docs/NON_FUNCTIONAL_REQUIREMENTS.md)
- [Nontechnical overview](docs/NON_TECHNICAL_OVERVIEW.md)
- [Technical architecture](docs/TECHNICAL_ARCHITECTURE.md)
