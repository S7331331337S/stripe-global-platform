import { newId, now } from "@/domain/ids";
import type {
  Actor,
  InboxEvent,
  JournalEntry,
  JournalKind,
  Mandate,
  Organization,
} from "@/domain/types";
import type {
  AppendJournalInput,
  CreateActorInput,
  CreateMandateInput,
  CreateOrganizationInput,
  Ledger,
} from "@/ledger/store";

export class MemoryLedger implements Ledger {
  private readonly organizations = new Map<string, Organization>();
  private readonly actors = new Map<string, Actor>();
  private readonly mandates = new Map<string, Mandate>();
  private readonly journal: JournalEntry[] = [];
  private readonly inbox = new Map<string, InboxEvent>();

  createOrganization(input: CreateOrganizationInput): Organization {
    const org: Organization = {
      id: newId(),
      name: input.name,
      email: input.email,
      country: input.country.toUpperCase(),
      platformFeeBps: input.platformFeeBps ?? 50,
      recipientTransferStatus: "unknown",
      isTenantZero: input.isTenantZero ?? false,
      createdAt: now(),
    };
    this.organizations.set(org.id, org);
    return org;
  }

  getOrganization(id: string): Organization | null {
    return this.organizations.get(id) ?? null;
  }

  listOrganizations(): Organization[] {
    return [...this.organizations.values()];
  }

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
  ): Organization {
    const existing = this.organizations.get(id);
    if (!existing) {
      throw new Error(`Organization not found: ${id}`);
    }
    const next = { ...existing, ...patch };
    this.organizations.set(id, next);
    return next;
  }

  createActor(input: CreateActorInput): Actor {
    if (!this.organizations.has(input.orgId)) {
      throw new Error(`Organization not found: ${input.orgId}`);
    }
    const actor: Actor = {
      id: newId(),
      orgId: input.orgId,
      kind: input.kind,
      name: input.name,
      createdAt: now(),
    };
    this.actors.set(actor.id, actor);
    return actor;
  }

  getActor(id: string): Actor | null {
    return this.actors.get(id) ?? null;
  }

  createMandate(input: CreateMandateInput): Mandate {
    if (!this.organizations.has(input.orgId)) {
      throw new Error(`Organization not found: ${input.orgId}`);
    }
    const actor = this.actors.get(input.actorId);
    if (!actor || actor.orgId !== input.orgId) {
      throw new Error(`Actor not found on organization: ${input.actorId}`);
    }
    const mandate: Mandate = {
      id: newId(),
      orgId: input.orgId,
      actorId: input.actorId,
      purpose: input.purpose,
      maxAmountCents: input.maxAmountCents,
      expiresAt: input.expiresAt,
      createdAt: now(),
    };
    this.mandates.set(mandate.id, mandate);
    return mandate;
  }

  getMandate(id: string): Mandate | null {
    return this.mandates.get(id) ?? null;
  }

  appendJournal(input: AppendJournalInput): JournalEntry {
    const entry: JournalEntry = {
      id: newId(),
      orgId: input.orgId,
      actorId: input.actorId,
      mandateId: input.mandateId,
      kind: input.kind,
      stripeObjectId: input.stripeObjectId,
      stripeEventId: input.stripeEventId,
      amountCents: input.amountCents,
      currency: input.currency,
      details: input.details ?? {},
      createdAt: now(),
    };
    this.journal.push(entry);
    return entry;
  }

  listJournal(filter?: {
    orgId?: string;
    mandateId?: string;
    kind?: JournalKind;
  }): JournalEntry[] {
    return this.journal.filter((entry) => {
      if (filter?.orgId && entry.orgId !== filter.orgId) return false;
      if (filter?.mandateId && entry.mandateId !== filter.mandateId) return false;
      if (filter?.kind && entry.kind !== filter.kind) return false;
      return true;
    });
  }

  putInboxEvent(
    event: Omit<InboxEvent, "receivedAt" | "processed"> & { processed?: boolean }
  ): { event: InboxEvent; inserted: boolean } {
    const existing = this.inbox.get(event.id);
    if (existing) {
      return { event: existing, inserted: false };
    }
    const stored: InboxEvent = {
      id: event.id,
      type: event.type,
      payload: event.payload,
      processed: event.processed ?? false,
      receivedAt: now(),
    };
    this.inbox.set(stored.id, stored);
    return { event: stored, inserted: true };
  }

  getInboxEvent(id: string): InboxEvent | null {
    return this.inbox.get(id) ?? null;
  }

  listUnprocessedInbox(): InboxEvent[] {
    return [...this.inbox.values()].filter((event) => !event.processed);
  }

  markInboxProcessed(id: string): InboxEvent {
    const existing = this.inbox.get(id);
    if (!existing) {
      throw new Error(`Inbox event not found: ${id}`);
    }
    const next: InboxEvent = {
      ...existing,
      processed: true,
      processedAt: now(),
    };
    this.inbox.set(id, next);
    return next;
  }
}

let singleton: MemoryLedger | null = null;

export function getLedger(): Ledger {
  if (!singleton) {
    singleton = new MemoryLedger();
  }
  return singleton;
}

export function resetLedger(): MemoryLedger {
  singleton = new MemoryLedger();
  return singleton;
}
