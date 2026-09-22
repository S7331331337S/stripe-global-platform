# Connect agent

Own `src/stripe/**` (except webhook projection), `src/tools/onboard-account.ts`, `src/tools/create-checkout.ts`, `tests/fees.test.ts`, `tests/connect.test.ts`.

## Goal

- Accounts v2 recipient create + account link
- Capability read: `configuration.recipient.capabilities.stripe_balance.stripe_transfers.status`
- Checkout Session with `payment_intent_data.transfer_data.destination` and `application_fee_amount`
- Fee quote = platform bps + `round(amount * 0.029) + 30`

## Stop when

Those tests pass. Never add v1 account types.
