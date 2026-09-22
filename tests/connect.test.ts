import { describe, expect, it } from "vitest";
import { MemoryLedger } from "@/ledger/memory";
import { mockJev } from "@/jev/mock";
import { mockStripePorts } from "@/stripe/mock";
import { onboardAccount } from "@/tools/onboard-account";
import { createCheckout } from "@/tools/create-checkout";
import { readRecipientStatus } from "@/stripe/connect";

describe("Connect + destination checkout", () => {
  it("does not create v1 express account types", async () => {
    const ledger = new MemoryLedger();
    const ports = mockStripePorts();
    const result = await onboardAccount(
      {
        name: "G's Stock",
        email: "ops@gs-stock.test",
        country: "US",
        isTenantZero: true,
      },
      { ledger, connect: ports.connect, jev: mockJev() }
    );

    expect(result.stripeAccountId.startsWith("acct_")).toBe(true);
    expect(ports.connect.created[0]).toMatchObject({
      name: "G's Stock",
      email: "ops@gs-stock.test",
      country: "US",
    });
    expect(ports.connect.created[0]).not.toHaveProperty("type");
  });

  it("creates a destination checkout with fee and mandate metadata", async () => {
    const ledger = new MemoryLedger();
    const ports = mockStripePorts();
    ports.connect.nextStatus = "active";

    const onboarded = await onboardAccount(
      {
        name: "G's Stock",
        email: "ops@gs-stock.test",
        country: "US",
      },
      { ledger, connect: ports.connect, jev: mockJev() }
    );

    const actor = ledger.getActor(onboarded.actorId);
    if (!actor) throw new Error("actor missing");
    const mandate = ledger.createMandate({
      orgId: onboarded.orgId,
      actorId: actor.id,
      purpose: "catalog",
      maxAmountCents: 5000,
      expiresAt: Date.now() + 60_000,
    });

    const checkout = await createCheckout(
      {
        orgId: onboarded.orgId,
        actorId: actor.id,
        mandateId: mandate.id,
        items: [{ name: "BPC157 10mg", amountCents: 2000, quantity: 1 }],
      },
      { ledger, checkout: ports.checkout, jev: mockJev() }
    );

    const created = ports.checkout.created[0];
    expect(created?.connectedAccountId).toBe(onboarded.stripeAccountId);
    expect(created?.applicationFeeCents).toBe(98);
    expect(created?.metadata).toMatchObject({
      org_id: onboarded.orgId,
      actor_id: actor.id,
      mandate_id: mandate.id,
      purpose: "catalog",
    });
    expect(checkout.checkoutId).toMatch(/^cs_mock_/);
    expect(ledger.listJournal({ kind: "checkout.created" })).toHaveLength(1);
  });

  it("reads v2 recipient transfer status", () => {
    expect(
      readRecipientStatus({
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { status: "active" },
              },
            },
          },
        },
      })
    ).toBe("active");
  });
});
