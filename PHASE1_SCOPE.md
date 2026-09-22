# Phase 1 Scope — Stripe Intelligence Platform

**Status:** in progress  
**Branch:** `cursor/phase1-intelligence-platform-8c01`  
**Done when:** `npm test` and `npm run agents:loop` both exit 0

Stripe is the money OS. This repo is the intelligence layer: a ledger of record, Connect destination charges, and programming agents that run tool loops until a goal is true.

G's Stock (`stripe-payment-web-app`) is tenant zero — a merchant node, not this platform. Do not merge the storefront into this repo.

---

## Out of scope (Phase 2+)

- Stripe Issuing, Treasury, USDC, ACP, MPP
- Production Postgres / Redis
- Live-mode keys
- Admin dashboard UI beyond a status page
- Rebuilding G's Stock checkout

---

## Connect configuration (locked)

Marketplace / platform-owned checkout. Accounts v2 only. Never `type: express|custom|standard`.

| Dimension | Value |
|---|---|
| Dashboard | `express` |
| `fees_collector` | `application` |
| `losses_collector` | `application` |
| Account shape | Recipient (`configuration.recipient`) |
| Capability to check | `configuration.recipient.capabilities.stripe_balance.stripe_transfers.status === "active"` |
| Charge pattern | Destination charges |
| Fee | `application_fee_amount` = platform bps + estimated Stripe processing fee |

Do not use `charges_enabled` / `payouts_enabled`. Do not use `application_fee_amount` with separate charges and transfers.

Platform fee default: **50 bps (0.50%)**. Stripe estimate: `round(amount * 0.029) + 30` cents. Reject if fee >= amount.

---

## Domain objects

| Object | Meaning |
|---|---|
| **Organization** | A connected recipient + optional G's Stock tenant flag |
| **Actor** | Human or agent. Agents never receive `sk_` keys |
| **Mandate** | Who may charge/onboard, max amount, until when |
| **JournalEntry** | Canonical money/business fact. Stripe IDs are evidence |
| **InboxEvent** | Stripe webhook event, unique on `event.id` |

Every Checkout Session metadata must include `org_id`, `actor_id`, `mandate_id`, `purpose`.

---

## Agent tools (Phase 1)

| Tool | Input | Success |
|---|---|---|
| `onboard_account` | name, email, country, actor | Org + recipient account + Account Link URL |
| `create_checkout` | org, actor, mandate, line items | Destination Checkout Session URL |
| `reconcile_event` | raw Stripe event | Inbox row + journal projection |

Issuing (`issue_card`, `authorize_spend`) is Phase 3.

---

## Programming agents

Deterministic loops in `src/agents`. Each agent has a goal predicate. The loop calls tools until the goal is true, the step budget is hit, or a tool fails.

| Agent | Goal | Tools |
|---|---|---|
| `onboard` | org exists with `stripeAccountId` and `onboardingUrl` | `onboard_account` |
| `checkout` | journal has a `checkout.created` entry for the mandate | `create_checkout` |
| `reconcile` | every inbox event is `processed` | `reconcile_event` |

`npm run agents:loop` runs all three against an in-memory ledger + Stripe port until complete (or fails).

---

## Acceptance checks

1. `npm test` — ledger idempotency, fee math, destination checkout metadata, agent loops
2. `npm run type-check`
3. `npm run agents:loop` exits 0
4. Webhook handler verifies signatures and keys idempotency on **event.id**
5. Connect adapter never creates v1 `type: "express"` accounts
6. Health route does not throw at import time if env is missing
7. No `any` in `src/**`

---

## Webhooks to project

| Event | Journal `kind` |
|---|---|
| `checkout.session.completed` | `checkout.completed` |
| `payment_intent.succeeded` | `payment.succeeded` |
| `payment_intent.payment_failed` | `payment.failed` |
| `account.updated` | `account.updated` |
| `charge.dispute.created` | `dispute.created` (Dispute object, not Charge) |

---

## Persistence

Phase 1 store is an in-memory ledger behind `Ledger` (`src/ledger/store.ts`). Postgres is Phase 1.1. Tests always use a fresh memory ledger.

---

## Agent briefs

Coding agents that continue this work must read:

- `agents/orchestrator.md` — loop protocol
- `agents/ledger.md`
- `agents/connect.md`
- `agents/reconcile.md`

Do not expand scope. If a check fails, fix the failing check and re-run the loop.
