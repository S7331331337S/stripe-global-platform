# Stripe Intelligence Platform

Phase 1 of an intelligence layer on Stripe: a ledger of record, Connect destination charges (Accounts v2), and programming agents that run tool loops until a goal is true.

This is **not** a live global payments product. G's Stock lives in `stripe-payment-web-app` and is tenant zero — a merchant node, not this repo.

Read **[PHASE1_SCOPE.md](./PHASE1_SCOPE.md)** for the locked configuration and acceptance checks.

## What Phase 1 does

- Onboard a recipient connected account (`dashboard: express`, platform owns fees and losses)
- Create a destination Checkout Session with `application_fee_amount`
- Ingest Stripe webhooks into an idempotent inbox keyed by `event.id`
- Project events into an append-only journal
- Run `onboard`, `checkout`, and `reconcile` agents until their goals complete

## Commands

```bash
npm install
npm test
npm run type-check
npm run agents:loop
npm run dev
```

Health: `GET /api/health`  
Webhook: `POST /api/webhooks/stripe`  
Tools: `POST /api/tools/run` with `x-agent-secret`

## Agent briefs

If you are a coding agent continuing this work, start at `agents/orchestrator.md` and loop on the failing check until `npm test` and `npm run agents:loop` both pass. Do not start Phase 2.
