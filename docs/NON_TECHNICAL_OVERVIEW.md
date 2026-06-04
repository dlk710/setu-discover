# SETU - DISCOVER Nontechnical Overview

## What It Is

SETU - DISCOVER is an internal discovery workbench for finding profile-building opportunities that can support a client's evidence portfolio. The product helps the team move from manual research to structured, reviewable, agent-assisted discovery.

## What It Helps The Team Do

- Keep a single inventory of awards, judging panels, press opportunities, speaking calls, and similar profile-building records.
- Keep client profile priorities in one place.
- Match clients to opportunities using visible scoring.
- Email relevant opportunities to clients.
- Refresh opportunities from trusted sources.
- Let an agent discover new pages within approved source domains.
- Route uncertain results to a human before they become client-facing recommendations.

## How The Phases Work

### Phase 1

The team manually enters opportunities and clients, then matches and emails opportunities. This establishes the system of record.

### Phase 2

The system checks trusted source pages every day or on demand. It skips pages that have not changed and extracts opportunity details from pages that did change.

### Phase 3

The system adds a constrained discovery agent. The agent can look inside approved domains, find new relevant pages, extract opportunities, and send uncertain cases to a human review queue.

## What Humans Still Control

- Which sources are trusted.
- Which uncertain opportunities are approved or rejected.
- Which opportunities are sent to clients.
- Source credibility tiers and source status.
- Final client communication.

## What AI Does

AI is optional and scoped. Phase 2 can use OpenAI structured extraction when changed source content needs parsing. Phase 3 runs local rule extraction first and can optionally escalate low-confidence records to OpenAI. AI does not control login, CRUD, deterministic matching, source allowlists, or email sending.

## Review Queue Meaning

The review queue is where the product asks a human to decide. Items appear when extraction confidence is low or a policy rule says the opportunity should not be automatically accepted. Approving a Phase 3 item puts it into the inventory. Rejecting it closes it out.

## Current Local Review Account

- Admin: `admin@marga.local`
- Password: `marga123`

These credentials are for local review only.

