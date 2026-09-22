import type {
  Actor,
  InboxEvent,
  JournalEntry,
  JournalKind,
  Mandate,
  Organization,
} from "@/domain/types";

export interface CreateOrganizationInput {
  name: string;
  email: string;
  country: string;
  platformFeeBps?: number;
  isTenantZero?: boolean;
}

export interface CreateActorInput {
  orgId: string;
  kind: "human" | "agent";
  name: string;
}

export interface CreateMandateInput {
  orgId: string;
  actorId: string;
  purpose: string;
  maxAmountCents: number;
  expiresAt: number;
}

export interface AppendJournalInput {
  orgId?: string;
  actorId?: string;
  mandateId?: string;
  kind: JournalKind;
  stripeObjectId?: string;
  stripeEventId?: string;
  amountCents?: number;
  currency?: string;
  details?: Record<string, unknown>;
}

export interface Ledger {
  createOrganization(input: CreateOrganizationInput): Organization;
  getOrganization(id: string): Organization | null;
  listOrganizations(): Organization[];
  updateOrganization(
    id: string,
    patch: Partial<
      Pick<
        Organization,
        | "stripeAccountId"
        | "onboardingUrl"
        | "recipientTransferStatus"
        | "platformFeeBps"
      >
    >
  ): Organization;

  createActor(input: CreateActorInput): Actor;
  getActor(id: string): Actor | null;

  createMandate(input: CreateMandateInput): Mandate;
  getMandate(id: string): Mandate | null;

  appendJournal(input: AppendJournalInput): JournalEntry;
  listJournal(filter?: {
    orgId?: string;
    mandateId?: string;
    kind?: JournalKind;
  }): JournalEntry[];

  putInboxEvent(event: Omit<InboxEvent, "receivedAt" | "processed"> & { processed?: boolean }): {
    event: InboxEvent;
    inserted: boolean;
  };
  getInboxEvent(id: string): InboxEvent | null;
  listUnprocessedInbox(): InboxEvent[];
  markInboxProcessed(id: string): InboxEvent;
}
