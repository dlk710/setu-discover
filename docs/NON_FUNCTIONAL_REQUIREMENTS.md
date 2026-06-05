# Discover Nonfunctional Requirements

## Deployment Model

- The application is local-first.
- The default local URL is `http://localhost:3004`.
- PostgreSQL is required for persistence.
- Docker Compose provides a reproducible local database and app runtime.
- Bare local mode is supported when PostgreSQL is already running.

## Reliability

- Phase 2 skips unchanged pages using content hashes.
- Phase 3 uses explicit graph nodes so failures are isolated by stage.
- Repeated Phase 3 fetch failures are written to dead letters.
- Sources that return zero candidates create alerts for likely layout changes.
- Agent runs store checkpoints and graph step traces for diagnosis.
- Phase 4 Evidence exports are generated on demand from current database state, avoiding stale packet storage.

## Safety and Guardrails

- Fetches are restricted to canonical source domains.
- Local fixture URLs are allowed only under `/phase2-fixtures/` for review/demo use.
- Denylisted domains are blocked.
- Pay-to-play concerns are routed to human review when fees and low credibility tiers indicate risk.
- Low-confidence extractions are not silently accepted by the Phase 3 agent.
- Curator proposals do not enter the trusted source registry until an admin adds them.
- Evidence export is a structured evidence packet, not an automatic petition filing.

## Security

- Secrets must remain in `.env.local`, `.env`, host environment variables, or deployment secret stores.
- `.env.local` is ignored by git.
- `OPENAI_API_KEY` must never be committed.
- Run-token access uses `PHASE2_RUN_TOKEN` for local Phase 2 and Phase 3 automation endpoints.
- The current local auth is team/admin oriented; public client login is out of scope for Phase 3.

## Performance

- Phase 2 avoids repeated LLM/model work on unchanged pages.
- Phase 3 runs local rule extraction first.
- OpenAI escalation is opt-in for Phase 3 via `PHASE3_OPENAI_ESCALATION=true`.
- Phase 4 semantic scoring is local and deterministic by default.
- Match recomputation is scoped to top ranked opportunities per client.
- Current scale target is local/team usage with curated source registry size.

## Observability

- Phase 2 exposes ingestion run history and extraction item reports.
- Phase 3 exposes agent run history, graph traces, alerts, and dead letters.
- Each Phase 3 graph node records a trace row with output and decision metadata.
- Review queue count is visible in navigation.
- Phase 4 exposes proposal reasons, match score breakdowns, and export readiness.

## Maintainability

- The `events` table remains the system-of-record spine.
- Phase 2 and Phase 3 reuse the same guarded fetch and extraction primitives.
- Phase 4 keeps semantic score in the match breakdown contract so future Qdrant embeddings can replace the local scorer without changing UI surfaces.
- UI components follow the existing Discover visual language.
- Tables are responsive and verified for no horizontal overflow on mobile and desktop.

## Compliance and Data Handling

- The product stores opportunity/source/client records in local PostgreSQL.
- It does not store OpenAI responses separately beyond extracted opportunity payloads and review payloads.
- Operators should treat client profile data as sensitive.
- Any hosted deployment should add managed secrets, backups, TLS, and stricter auth before production use.
