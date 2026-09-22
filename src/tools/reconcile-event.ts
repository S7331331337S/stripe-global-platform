import { z } from "zod";
import type { Ledger } from "@/ledger/store";
import { projectStripeEvent, type StripeLikeEvent } from "@/stripe/webhooks";

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

export function reconcileEvent(
  input: ReconcileEventInput,
  deps: { ledger: Ledger }
): { inserted: boolean; journalId?: string; eventId: string } {
  const parsed = ReconcileEventInputSchema.parse(input);
  const result = projectStripeEvent(parsed.event as StripeLikeEvent, deps.ledger);
  return {
    eventId: parsed.event.id,
    inserted: result.inserted,
    journalId: result.journalId,
  };
}
