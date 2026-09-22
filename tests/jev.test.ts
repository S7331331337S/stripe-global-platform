import { describe, expect, it } from "vitest";
import { MemoryLedger } from "@/ledger/memory";
import { getTypeSafeClient, resetTypeSafeClient } from "@/jev/client";
import { mockJev } from "@/jev/mock";
import { decideCheckout, decideOnboard, decideReconcile } from "@/jev/policy";
import { mockStripePorts } from "@/stripe/mock";
import { createCheckout } from "@/tools/create-checkout";
import { onboardAccount } from "@/tools/onboard-account";
import { reconcileEvent } from "@/tools/reconcile-event";

describe("Jev policy", () => {
  it("does not construct TypeSafeClient without TYPESAFE_API_KEY", () => {
    const previous = process.env.TYPESAFE_API_KEY;
    delete process.env.TYPESAFE_API_KEY;
    resetTypeSafeClient();

    expect(() => getTypeSafeClient()).toThrow(/TYPESAFE_API_KEY/);

    if (previous === undefined) {
      delete process.env.TYPESAFE_API_KEY;
    } else {
      process.env.TYPESAFE_API_KEY = previous;
    }
    resetTypeSafeClient();
  });

  it("approves a routine checkout with proceed + noul + low risk", async () => {
    const jev = mockJev();
    const verdict = await decideCheckout(jev, {
      tool: "create_checkout",
      orgId: "00000000-0000-4000-8000-000000000001",
      actorId: "00000000-0000-4000-8000-000000000002",
      mandateId: "00000000-0000-4000-8000-000000000003",
      purpose: "catalog",
      amountCents: 2000,
      mandateMaxCents: 5000,
      currency: "usd",
      recipientTransferStatus: "active",
      platformFeeBps: 50,
      applicationFeeCents: 98,
      itemCount: 1,
    });

    expect(verdict.decision).toBe("proceed");
    expect(verdict.model).toBe("jev-mock");
    expect(jev.asked).toHaveLength(1);
    expect(jev.asked[0]?.questions.action?.type).toBe("choice");
    expect(jev.asked[0]?.questions.withinMandate?.type).toBe("noul");
    expect(jev.asked[0]?.questions.risk?.type).toBe("score");
  });

  it("rejects onboarding when noul is low and does not create an org", async () => {
    const ledger = new MemoryLedger();
    const ports = mockStripePorts();
    const jev = mockJev();
    jev.nextNoul.proceed = 0.1;

    await expect(
      onboardAccount(
        {
          name: "Rejected Co",
          email: "ops@reject.test",
          country: "US",
        },
        { ledger, connect: ports.connect, jev }
      )
    ).rejects.toThrow("Jev rejected onboarding");

    expect(ledger.listOrganizations()).toHaveLength(0);
    expect(ports.connect.created).toHaveLength(0);
    expect(ledger.listJournal({ kind: "policy.decided" })).toHaveLength(1);
  });

  it("blocks checkout when Jev chooses reject", async () => {
    const ledger = new MemoryLedger();
    const ports = mockStripePorts();
    const approve = mockJev();
    ports.connect.nextStatus = "active";

    const onboarded = await onboardAccount(
      {
        name: "G's Stock",
        email: "ops@gs-stock.test",
        country: "US",
      },
      { ledger, connect: ports.connect, jev: approve }
    );

    const mandate = ledger.createMandate({
      orgId: onboarded.orgId,
      actorId: onboarded.actorId,
      purpose: "catalog",
      maxAmountCents: 5000,
      expiresAt: Date.now() + 60_000,
    });

    const jev = mockJev();
    jev.nextChoice.action = "reject";

    await expect(
      createCheckout(
        {
          orgId: onboarded.orgId,
          actorId: onboarded.actorId,
          mandateId: mandate.id,
          items: [{ name: "BPC157 10mg", amountCents: 2000, quantity: 1 }],
        },
        { ledger, checkout: ports.checkout, jev }
      )
    ).rejects.toThrow("Jev rejected checkout");

    expect(ports.checkout.created).toHaveLength(0);
    expect(ledger.listJournal({ kind: "checkout.created" })).toHaveLength(0);
    expect(ledger.listJournal({ kind: "policy.decided" }).length).toBeGreaterThan(
      0
    );
  });

  it("escalates reconcile without projecting a business fact", async () => {
    const ledger = new MemoryLedger();
    const jev = mockJev();
    jev.nextChoice.action = "escalate";

    const result = await reconcileEvent(
      {
        event: {
          id: "evt_escalate",
          type: "payment_intent.succeeded",
          data: {
            object: { id: "pi_1", amount: 2000, currency: "usd" },
          },
        },
      },
      { ledger, jev }
    );

    expect(result.escalated).toBe(true);
    expect(result.inserted).toBe(true);
    expect(ledger.listJournal({ kind: "payment.succeeded" })).toHaveLength(0);
    expect(ledger.listJournal({ kind: "policy.decided" })).toHaveLength(1);
    expect(ledger.listUnprocessedInbox()).toHaveLength(0);
  });

  it("approves onboard and reconcile by default", async () => {
    const jev = mockJev();
    const onboard = await decideOnboard(jev, {
      tool: "onboard_account",
      name: "G's Stock",
      email: "ops@gs-stock.test",
      country: "US",
      isTenantZero: true,
    });
    const reconcile = await decideReconcile(jev, {
      tool: "reconcile_event",
      eventId: "evt_1",
      eventType: "checkout.session.completed",
      knownKind: "checkout.completed",
    });

    expect(onboard.decision).toBe("proceed");
    expect(reconcile.decision).toBe("project");
  });
});
