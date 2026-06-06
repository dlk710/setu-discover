# Discover

Local Discover profile-discovery portal for operating opportunity inventory, client profiles, canonical source ingestion, agentic discovery, hybrid matching, client portal preview, evidence export, and email-out logging.

## Run locally with Docker

```bash
docker compose up --build
```

Open `http://localhost:3004`.

Demo users:

- `admin@discover.local` / `discover123`
- `teammate@discover.local` / `discover123`

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
DISCOVER_URL=http://localhost:3004
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

## Phase 4 product finish

Phase 4 adds the intelligence and scale layer:

- Hybrid heuristic plus semantic matching.
- Client portal preview for criteria coverage and ranked recommendations.
- Curator proposals for new source registry additions.
- Discover evidence export JSON for client/opportunity packets.
- Vetted standing opportunities from the EB-1A master registry so active inventory contains real client-action paths, not fake fixtures.
- Inventory added-date visibility so the team can scan when each opportunity entered the active record set.

## Finance engagement status integration

Discover consumes only the customer engagement flag from Setu Finance. It never connects to the Finance database and does not store amount, invoice, or payment fields.

Configure the consumer endpoint in `.env.local`:

```bash
FINANCE_BASE_URL=http://127.0.0.1:4173
FINANCE_INTEGRATION_KEY=replace-with-finance-integration-key
WEBHOOK_SECRET=replace-with-finance-webhook-secret
```

Run a full sync on demand:

```bash
npm run finance:sync
```

The Phase 2 scheduler also runs the Finance sync hourly when configured and forces a sync before the 06:00 discovery cycle. New opportunity pushes, match lists, client portal recommendations, and evidence exports fail closed unless the client is `active` with a status timestamp less than 24 hours old.

## Documentation

- [Product capabilities](docs/PRODUCT_CAPABILITIES.md)
- [Functional specification](docs/FUNCTIONAL_SPEC.md)
- [Finance engagement integration](docs/FINANCE_ENGAGEMENT_INTEGRATION.md)
- [Nonfunctional requirements](docs/NON_FUNCTIONAL_REQUIREMENTS.md)
- [Nontechnical overview](docs/NON_TECHNICAL_OVERVIEW.md)
- [Technical architecture](docs/TECHNICAL_ARCHITECTURE.md)
- Product slide deck: `docs/Discover_Product_Deck.pptx`
