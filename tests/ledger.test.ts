import { describe, expect, it } from "vitest";
import { MemoryLedger } from "@/ledger/memory";

describe("MemoryLedger", () => {
  it("creates org, actor, and mandate together", () => {
    const ledger = new MemoryLedger();
    const org = ledger.createOrganization({
      name: "G's Stock",
      email: "ops@gs-stock.test",
      country: "us",
      isTenantZero: true,
    });
    const actor = ledger.createActor({
      orgId: org.id,
      kind: "agent",
      name: "onboard",
    });
    const mandate = ledger.createMandate({
      orgId: org.id,
      actorId: actor.id,
      purpose: "catalog",
      maxAmountCents: 5000,
      expiresAt: Date.now() + 1000,
    });

    expect(org.country).toBe("US");
    expect(org.isTenantZero).toBe(true);
    expect(mandate.actorId).toBe(actor.id);
  });

  it("is idempotent on Stripe event.id", () => {
    const ledger = new MemoryLedger();
    const first = ledger.putInboxEvent({
      id: "evt_1",
      type: "payment_intent.succeeded",
      payload: { id: "evt_1" },
    });
    const second = ledger.putInboxEvent({
      id: "evt_1",
      type: "payment_intent.succeeded",
      payload: { id: "evt_1", extra: true },
    });

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(second.event.receivedAt).toBe(first.event.receivedAt);
  });

  it("appends journal entries without mutating previous ones", () => {
    const ledger = new MemoryLedger();
    const org = ledger.createOrganization({
      name: "A",
      email: "a@test.com",
      country: "US",
    });
    const first = ledger.appendJournal({
      orgId: org.id,
      kind: "onboarding.initiated",
    });
    const second = ledger.appendJournal({
      orgId: org.id,
      kind: "checkout.created",
      amountCents: 2000,
    });

    expect(ledger.listJournal()).toHaveLength(2);
    expect(first.id).not.toBe(second.id);
    expect(ledger.listJournal({ kind: "checkout.created" })).toHaveLength(1);
  });
});
