# Discover Product Capabilities

## What The Product Can Do Now

Discover is a local-first operating system for finding, qualifying, matching, sending, and exporting EB-1A profile-building opportunities.

## Core Operating Capabilities

- Maintain a PostgreSQL-backed opportunity inventory.
- Show the date each opportunity was added to inventory for quick freshness review.
- Maintain client profiles with target criteria, covered criteria, keywords, preferred categories, field, and location.
- Store each client's Finance-owned engagement flag as active, dormant, inactive, or unknown.
- Track source registry records from the EB-1A master source list.
- Monitor source pages with fetched and changed timestamps.
- Run guarded ingestion against canonical source domains.
- Run a constrained LangGraph discovery agent.
- Route uncertain, low-confidence, or policy-flagged records to review.
- Approve or reject review items before records become client-facing.
- Send or locally simulate recommendation emails.
- Log email attempts against clients and opportunities.
- Block opportunity pushes unless the client is Finance-active with fresh status.
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
- Client recommendations are hidden when the client is dormant, inactive, unknown, or stale.
- Evidence export creates a JSON evidence packet with:
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
- AI and matching cannot bypass the Finance engagement gate.

## Finance Engagement Gate

- Discover reads `GET /api/integration/engagement-status` from Finance using `X-Api-Key`.
- Discover stores only `engagement_status` and `engagement_as_of`.
- Discover never connects to the Finance database.
- Discover does not expose amounts, invoices, balances, payments, or thresholds.
- Admin screens show only the engagement badge.
- `unknown` is the default and is not pushable.

## What Humans Control

- Trusted source registry.
- Source credibility and refresh status.
- Review queue approvals and rejections.
- Client communication.
- Curator proposal approval.
- Final evidence use inside downstream evidence records.

## Local Review Entry Points

- App: `http://localhost:3004`
- Admin: `admin@discover.local`
- Password: `discover123`
- GitHub: `https://github.com/dlk710/setu-discover`
