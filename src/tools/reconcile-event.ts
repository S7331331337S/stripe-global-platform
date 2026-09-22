import { z } from "zod";
import type { JevPort } from "@/jev/port";
import { decideReconcile, type ReconcilePolicyState } from "@/jev/policy";
import type { Ledger } from "@/ledger/store";
import {
  journalKindForEvent,
  projectStripeEvent,
  type StripeLikeEvent,
} from "@/stripe/webhooks";

export const ReconcileEventInputSchema = z.object({
  event: z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    data: z.object({
      object: z.record(z.unknown()),
    }),
  }),
});

export type ReconcileEventInput = z.infer<typeof ReconcileEventInputSchema>;

export async function reconcileEvent(
  input: ReconcileEventInput,
  deps: { ledger: Ledger; jev: JevPort }
): Promise<{
  inserted: boolean;
  journalId?: string;
  eventId: string;
  escalated: boolean;
}> {
  const parsed = ReconcileEventInputSchema.parse(input);
  const existing = deps.ledger.getInboxEvent(parsed.event.id);
  if (existing) {
    return {
      eventId: parsed.event.id,
      inserted: false,
      escalated: false,
    };
  }

  const state: ReconcilePolicyState = {
    tool: "reconcile_event",
    eventId: parsed.event.id,
    eventType: parsed.event.type,
    knownKind: journalKindForEvent(parsed.event.type),
  };

  const verdict = await decideReconcile(deps.jev, state);
  deps.ledger.appendJournal({
    kind: "policy.decided",
    stripeEventId: parsed.event.id,
    details: {
      tool: "reconcile_event",
      model: verdict.model,
      decision: verdict.decision,
      reason: verdict.reason,
      answers: verdict.answers,
      state,
    },
  });

  if (verdict.decision === "escalate") {
    const { inserted } = deps.ledger.putInboxEvent({
      id: parsed.event.id,
      type: parsed.event.type,
      payload: parsed.event,
    });
    if (inserted) {
      deps.ledger.markInboxProcessed(parsed.event.id);
    }
    return {
      eventId: parsed.event.id,
      inserted,
      escalated: true,
    };
  }

  const result = projectStripeEvent(parsed.event as StripeLikeEvent, deps.ledger);
  return {
    eventId: parsed.event.id,
    inserted: result.inserted,
    journalId: result.journalId,
    escalated: false,
  };
}
