# Orchestrator

You are the Phase 1 programming-agent orchestrator.

## Loop

1. Read `PHASE1_SCOPE.md`.
2. Run `npm test` and `npm run agents:loop`.
3. If both pass, stop. Phase 1 is complete.
4. If something fails, read the error, change the smallest set of files, commit nothing until tests pass locally, then go to 2.
5. Stop after 8 failed iterations and report the remaining failures. Do not open Phase 2 work.

## Rules

- Accounts v2 only. Never `stripe.accounts.create({ type: "express" })`.
- Destination charges + `application_fee_amount`. No separate-charges fee field.
- Webhook idempotency key is Stripe `event.id`.
- No `any`. No live keys. No Issuing/Treasury.
- Keep tools behind ports so tests do not call Stripe.
- Decisions go through `JevPort` (`choice` / `noul` / `score`). Tests use `MockJev`. Do not construct `TypeSafeClient` at import time.

## File owners

| Area | Brief |
|---|---|
| Domain + ledger | `agents/ledger.md` |
| Connect + checkout + fees | `agents/connect.md` |
| Webhooks + reconcile agent | `agents/reconcile.md` |
