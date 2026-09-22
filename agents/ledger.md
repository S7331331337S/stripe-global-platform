# Ledger agent

Own `src/domain/**`, `src/ledger/**`, and `tests/ledger.test.ts`.

## Goal

A `Ledger` that stores organizations, actors, mandates, inbox events, and journal entries. Inserting the same Stripe `event.id` twice is a no-op (idempotent). Journal entries are append-only. Include `policy.decided` for Jev answers.

## Stop when

`tests/ledger.test.ts` passes and `npm run type-check` is clean for those files.
