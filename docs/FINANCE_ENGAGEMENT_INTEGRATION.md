# Finance Engagement Integration

## Purpose

Discover consumes the Setu Finance engagement flag so opportunity pushes go only to active customers. Finance owns the status calculation. Discover stores only the flag and the timestamp returned by Finance.

## Consumed Contract

```text
GET /api/integration/engagement-status
Header: X-Api-Key: <FINANCE_INTEGRATION_KEY>
```

Expected payload:

```json
{
  "as_of": "2026-06-05T11:00:00Z",
  "customers": [
    {
      "customer_id": "cus_abc",
      "email": "a@b.com",
      "engagement_status": "active",
      "as_of": "2026-06-05T11:00:00Z"
    }
  ]
}
```

Discover does not consume or expose amount, invoice, payment, subscription, balance, or threshold fields.

## Data Stored In Discover

The Discover customer table is `clients`. It now includes:

- `engagement_status`: `active`, `dormant`, `inactive`, or `unknown`
- `engagement_as_of`: Finance status timestamp

New or unmatched clients remain `unknown` and are not pushable.

## Sync Behavior

Run manually:

```bash
npm run finance:sync
```

The script:

- Calls `${FINANCE_BASE_URL}/api/integration/engagement-status`.
- Sends `X-Api-Key`.
- Matches clients by normalized email.
- Also matches any Finance-provided `aliases` values.
- Updates only `engagement_status` and `engagement_as_of`.
- Writes an `integration_sync_log` row with received and matched counts.

## Schedule

`npm run phase2:schedule` performs:

- Hourly Finance engagement sync when Finance env values are configured.
- A forced Finance sync before the daily Phase 2 discovery run.

The daily time remains controlled by `PHASE2_SCHEDULE_TIME`, defaulting to `06:00`.

## Push Gate

All client-facing opportunity pushes use the same guard:

- Status must be `active`.
- `engagement_as_of` must be present and no older than 24 hours.
- `dormant`, `inactive`, `unknown`, missing, or stale values fail closed.

Guarded surfaces:

- Match list API: `GET /api/matches`
- Email push API: `POST /api/email/send`
- Phase 2 recommendation recompute
- Phase 3 recommendation recompute
- Phase 4 client portal preview
- Evidence export endpoints

## Optional Webhook

Discover also accepts a Finance webhook:

```text
POST /api/webhooks/finance/engagement
Header: X-Signature: sha256=<hmac>
```

The HMAC uses `WEBHOOK_SECRET` and the raw JSON request body. The payload can contain one customer object or a `customers` array. The webhook updates only the same status and timestamp fields as the full sync.

## Local Env

```text
FINANCE_BASE_URL=http://127.0.0.1:4173
FINANCE_INTEGRATION_KEY=<same value as Finance INTEGRATION_API_KEY>
WEBHOOK_SECRET=<same as Finance webhook secret>
```
