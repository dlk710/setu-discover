# Discover Nontechnical Overview

## What It Is

Discover is an internal discovery workbench for finding profile-building opportunities that can support a client's evidence portfolio. The product helps the team move from manual research to structured, reviewable, agent-assisted discovery.

## What It Helps The Team Do

- Keep a single inventory of awards, judging panels, press opportunities, speaking calls, and similar profile-building records.
- Keep client profile priorities in one place.
- Match clients to opportunities using visible scoring.
- Make sure only Finance-active clients receive new opportunity recommendations.
- Email relevant opportunities to clients.
- Refresh opportunities from trusted sources.
- Let an agent discover new pages within approved source domains.
- Route uncertain results to a human before they become client-facing recommendations.
- Preview what a client would see: criteria coverage, open gaps, and recommended next actions.
- Export a structured Discover evidence packet for a client/opportunity pair.
- Review proposed new sources before they enter the trusted registry.

## How The Phases Work

### Phase 1

The team manually enters opportunities and clients, then matches and emails opportunities. This establishes the system of record.

### Phase 2

The system checks trusted source pages every day or on demand. It skips pages that have not changed and extracts opportunity details from pages that did change.

### Phase 3

The system adds a constrained discovery agent. The agent can look inside approved domains, find new relevant pages, extract opportunities, and send uncertain cases to a human review queue.

### Phase 4

The system adds the intelligence layer: hybrid semantic matching, client portal preview, curator proposals for source expansion, and Evidence export packets. Humans still approve source additions and client communication.

## Finance Status Connection

Discover reads one status flag from Setu Finance: active, dormant, inactive, or unknown. Finance owns the rule behind that flag. Discover does not see payment amounts or connect to Finance's database.

When a client is not active, or when the last Finance status is stale, Discover hides new recommendations and blocks outbound opportunity emails. Admins can still see the client profile and the engagement badge.

## What Humans Still Control

- Which sources are trusted.
- Which uncertain opportunities are approved or rejected.
- Which opportunities are sent to clients.
- Finance owns whether a client is active, dormant, or inactive.
- Source credibility tiers and source status.
- Final client communication.
- Whether a curator proposal becomes a trusted source.
- Whether a Evidence export is used downstream in a petition workflow.

## What AI Does

AI is optional and scoped. Phase 2 can use OpenAI structured extraction when changed source content needs parsing. Phase 3 runs local rule extraction first and can optionally escalate low-confidence records to OpenAI. Phase 4 semantic matching is deterministic and local by default. AI does not control login, CRUD, source allowlists, source approval, review approval, Evidence export usage, or email sending.

## Review Queue Meaning

The review queue is where the product asks a human to decide. Items appear when extraction confidence is low or a policy rule says the opportunity should not be automatically accepted. Approving a Phase 3 item puts it into the inventory. Rejecting it closes it out.

## Current Local Review Account

- Admin: `admin@discover.local`
- Password: `discover123`

These credentials are for local review only.
