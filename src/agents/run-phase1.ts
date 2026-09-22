import { MemoryLedger } from "@/ledger/memory";
import { mockStripePorts } from "@/stripe/mock";
import { runOnboardAgent } from "@/agents/onboard";
import { runCheckoutAgent } from "@/agents/checkout";
import { runReconcileAgent } from "@/agents/reconcile";
import type { StripeLikeEvent } from "@/stripe/webhooks";

export async function runPhase1Loop(): Promise<void> {
  const ledger = new MemoryLedger();
  const ports = mockStripePorts();
  ports.connect.nextStatus = "active";

  const onboard = await runOnboardAgent(
    {
      name: "G's Stock",
      email: "ops@gs-stock.test",
      country: "US",
      isTenantZero: true,
    },
    { ledger, connect: ports.connect }
  );

  if (!onboard.complete || !onboard.goal) {
    throw new Error(`onboard agent failed: ${onboard.error ?? "unknown"}`);
  }

  const org = ledger.getOrganization(onboard.goal.orgId);
  if (!org) {
    throw new Error("tenant zero org missing");
  }

  const actor = ledger.createActor({
    orgId: org.id,
    kind: "agent",
    name: "checkout-agent",
  });
  const mandate = ledger.createMandate({
    orgId: org.id,
    actorId: actor.id,
    purpose: "tenant-zero-catalog",
    maxAmountCents: 10000,
    expiresAt: Date.now() + 60 * 60 * 1000,
  });

  const checkout = await runCheckoutAgent(
    {
      orgId: org.id,
      actorId: actor.id,
      mandateId: mandate.id,
      items: [{ name: "BPC157 10mg", amountCents: 2000, quantity: 1 }],
    },
    { ledger, checkout: ports.checkout }
  );

  if (!checkout.complete || !checkout.goal) {
    throw new Error(`checkout agent failed: ${checkout.error ?? "unknown"}`);
  }

  const session = ports.checkout.created[0];
  if (!session) {
    throw new Error("mock checkout session missing");
  }

  const events: StripeLikeEvent[] = [
    {
      id: "evt_session_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: checkout.goal.checkoutId,
          amount_total: 2000,
          currency: "usd",
          metadata: session.metadata,
        },
      },
    },
    {
      id: "evt_pi_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_mock_1",
          amount: 2000,
          currency: "usd",
          metadata: session.metadata,
        },
      },
    },
  ];

  const reconcile = await runReconcileAgent(events, { ledger });
  if (!reconcile.complete || !reconcile.goal) {
    throw new Error(`reconcile agent failed: ${reconcile.error ?? "unknown"}`);
  }

  const created = ports.connect.created[0];
  if (!created || created.email !== "ops@gs-stock.test") {
    throw new Error("connect port was not used");
  }
  if (ports.checkout.created[0]?.applicationFeeCents === undefined) {
    throw new Error("destination checkout missing application fee");
  }
  if (!ports.checkout.created[0].metadata.org_id) {
    throw new Error("checkout metadata missing org_id");
  }

  console.log(
    JSON.stringify(
      {
        complete: true,
        onboard: onboard.goal,
        checkout: checkout.goal,
        reconcile: reconcile.goal,
        journal: ledger.listJournal().map((entry) => entry.kind),
      },
      null,
      2
    )
  );
}
