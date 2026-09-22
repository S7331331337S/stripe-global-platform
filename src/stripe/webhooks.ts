import type { JournalKind } from "@/domain/types";
import type { Ledger } from "@/ledger/store";

export interface StripeLikeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

const EVENT_TO_KIND: Record<string, JournalKind> = {
  "checkout.session.completed": "checkout.completed",
  "payment_intent.succeeded": "payment.succeeded",
  "payment_intent.payment_failed": "payment.failed",
  "account.updated": "account.updated",
  "charge.dispute.created": "dispute.created",
};

export function journalKindForEvent(type: string): JournalKind | null {
  return EVENT_TO_KIND[type] ?? null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function metadataOf(object: Record<string, unknown>): Record<string, unknown> {
  const metadata = object.metadata;
  return typeof metadata === "object" && metadata !== null
    ? (metadata as Record<string, unknown>)
    : {};
}

export function projectStripeEvent(event: StripeLikeEvent, ledger: Ledger): {
  inserted: boolean;
  journalId?: string;
} {
  const { event: inbox, inserted } = ledger.putInboxEvent({
    id: event.id,
    type: event.type,
    payload: event,
  });

  if (!inserted) {
    return { inserted: false };
  }

  if (inbox.processed) {
    return { inserted: false };
  }

  const kind = journalKindForEvent(event.type);
  if (!kind) {
    ledger.markInboxProcessed(event.id);
    return { inserted: true };
  }

  const object = event.data.object;
  const metadata = metadataOf(object);

  const stripeObjectId =
    asString(object.id) ??
    asString(object.payment_intent) ??
    asString(object.charge);

  const amountCents =
    asNumber(object.amount_total) ??
    asNumber(object.amount) ??
    asNumber(object.amount_cents);

  const currency = asString(object.currency)?.toUpperCase();

  const entry = ledger.appendJournal({
    orgId: asString(metadata.org_id),
    actorId: asString(metadata.actor_id),
    mandateId: asString(metadata.mandate_id),
    kind,
    stripeObjectId,
    stripeEventId: event.id,
    amountCents,
    currency,
    details: {
      type: event.type,
      purpose: metadata.purpose,
    },
  });

  ledger.markInboxProcessed(event.id);
  return { inserted: true, journalId: entry.id };
}
