# SETU - DISCOVER Product Capabilities

## What The Product Can Do Now

SETU - DISCOVER is a local-first operating system for finding, qualifying, matching, sending, and exporting EB-1A profile-building opportunities.

## Core Operating Capabilities

- Maintain a PostgreSQL-backed opportunity inventory.
- Show the date each opportunity was added to inventory for quick freshness review.
- Maintain client profiles with target criteria, covered criteria, keywords, preferred categories, field, and location.
- Track source registry records from the EB-1A master source list.
- Monitor source pages with fetched and changed timestamps.
- Run guarded ingestion against canonical source domains.
- Run a constrained LangGraph discovery agent.
- Route uncertain, low-confidence, or policy-flagged records to review.
- Approve or reject review items before records become client-facing.
- Send or locally simulate recommendation emails.
- Log email attempts against clients and opportunities.
- Archive stale or unsuitable opportunities.

## Phase 4 Intelligence Capabilities

- Hybrid matching combines:
  - criteria gap fit
  - credibility tier
  - exact keyword fit
  - semantic text similarity
  - actionability
  - location fit
- Client portal preview shows:
  - target criteria
  - covered criteria
  - open gaps
  - ranked client-ready recommendations
  - next best action
- SETU export creates a JSON evidence packet with:
  - client profile details
  - opportunity details
  - source and apply links
  - Kazarian criteria tags
  - match score evidence
  - operating next steps
- Curator proposals recommend new canonical sources based on:
  - active client demand
  - open criteria gaps
  - missing active inventory categories
  - source credibility tier
- Admins can add a curator proposal into the source registry for future refreshes.

## Source And Opportunity Policy

- The EB-1A workbook is normalized into `data/source-registry.json`.
- `npm run db:setup` imports 45 canonical sources.
- The setup creates standing opportunities only for selected registry rows that are already client-action paths.
- Old local fixture opportunities are archived and are not active.
- Ingestion and agent discovery do not save broad source pages as active opportunities.
- A refreshed opportunity must have a public source/apply link on the canonical source domain before it can become active inventory.

## What AI Does

- OpenAI extraction is optional for changed source content.
- The Phase 3 agent uses deterministic extraction first and can escalate when configured.
- Phase 4 matching uses local deterministic semantic scoring, not external embeddings by default.
- AI does not automatically send emails, approve sources, approve review items, or bypass domain guardrails.

## What Humans Control

- Trusted source registry.
- Source credibility and refresh status.
- Review queue approvals and rejections.
- Client communication.
- Curator proposal approval.
- Final evidence use inside SETU petitions.

## Local Review Entry Points

- App: `http://localhost:3004`
- Admin: `admin@marga.local`
- Password: `marga123`
- GitHub: `https://github.com/dlk710/setu-discover`
