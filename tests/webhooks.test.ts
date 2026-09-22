import { describe, expect, it } from "vitest";
import { MemoryLedger } from "@/ledger/memory";
import { projectStripeEvent } from "@/stripe/webhooks";

describe("webhook projection", () => {
  it("keys idempotency on event.id", () => {
    const ledger = new MemoryLedger();
    const event = {
      id: "evt_123",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_123",
          amount: 2000,
          currency: "usd",
          metadata: { org_id: "00000000-0000-4000-8000-000000000001" },
        },
      },
    };

    const first = projectStripeEvent(event, ledger);
    const second = projectStripeEvent(event, ledger);

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(ledger.listJournal({ kind: "payment.succeeded" })).toHaveLength(1);
  });

  it("treats charge.dispute.created as a Dispute", () => {
    const ledger = new MemoryLedger();
    const result = projectStripeEvent(
      {
        id: "evt_dispute",
        type: "charge.dispute.created",
        data: {
          object: {
            id: "dp_123",
            amount: 2000,
            currency: "usd",
            charge: "ch_123",
          },
        },
      },
      ledger
    );

    expect(result.inserted).toBe(true);
    const entry = ledger.listJournal({ kind: "dispute.created" })[0];
    expect(entry?.stripeObjectId).toBe("dp_123");
  });
});
