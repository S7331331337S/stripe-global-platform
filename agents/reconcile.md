# Reconcile agent

Own `src/stripe/webhooks.ts`, `src/tools/reconcile-event.ts`, `src/pages/api/webhooks/stripe.ts`, `tests/webhooks.test.ts`, `src/agents/**`.

## Goal

Verify signatures, inbox on `event.id`, project listed events into journal kinds from `PHASE1_SCOPE.md`. `charge.dispute.created` is a Dispute. The `reconcile_event` tool asks Jev to project or escalate. The HTTP webhook handler still projects mechanically. Agent loops in `src/agents` run until their goal predicates are true.

## Stop when

`npm test` and `npm run agents:loop` pass.
