import { describe, expect, it } from "vitest";
import { MemoryLedger } from "@/ledger/memory";
import { mockStripePorts } from "@/stripe/mock";
import { runOnboardAgent } from "@/agents/onboard";
import { runCheckoutAgent } from "@/agents/checkout";
import { runReconcileAgent } from "@/agents/reconcile";
import { runPhase1Loop } from "@/agents/run-phase1";

describe("programming agents", () => {
  it("runs onboard, checkout, and reconcile until complete", async () => {
    const ledger = new MemoryLedger();
    const ports = mockStripePorts();
    ports.connect.nextStatus = "active";

    const onboard = await runOnboardAgent(
      { name: "G's Stock", email: "ops@gs-stock.test", country: "US" },
      { ledger, connect: ports.connect }
    );
    expect(onboard.complete).toBe(true);
    if (!onboard.goal) throw new Error("missing onboard goal");

    const actor = ledger.createActor({
      orgId: onboard.goal.orgId,
      kind: "agent",
      name: "buyer",
    });
    const mandate = ledger.createMandate({
      orgId: onboard.goal.orgId,
      actorId: actor.id,
      purpose: "catalog",
      maxAmountCents: 5000,
      expiresAt: Date.now() + 60_000,
    });

    const checkout = await runCheckoutAgent(
      {
        orgId: onboard.goal.orgId,
        actorId: actor.id,
        mandateId: mandate.id,
        items: [{ name: "BPC157 10mg", amountCents: 2000, quantity: 1 }],
      },
      { ledger, checkout: ports.checkout }
    );
    expect(checkout.complete).toBe(true);

    const session = ports.checkout.created[0];
    const reconcile = await runReconcileAgent(
      [
        {
          id: "evt_done",
          type: "checkout.session.completed",
          data: {
            object: {
              id: checkout.goal?.checkoutId,
              amount_total: 2000,
              currency: "usd",
              metadata: session?.metadata ?? {},
            },
          },
        },
      ],
      { ledger }
    );

    expect(reconcile.complete).toBe(true);
    expect(ledger.listUnprocessedInbox()).toHaveLength(0);
    expect(ledger.listJournal({ kind: "checkout.completed" })).toHaveLength(1);
  });

  it("completes the Phase 1 loop script", async () => {
    await expect(runPhase1Loop()).resolves.toBeUndefined();
  });
});
