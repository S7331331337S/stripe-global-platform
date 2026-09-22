import { z } from "zod";

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  country: z.string().length(2),
  stripeAccountId: z.string().optional(),
  onboardingUrl: z.string().url().optional(),
  platformFeeBps: z.number().int().min(0).max(1000).default(50),
  recipientTransferStatus: z
    .enum(["active", "pending", "inactive", "unknown"])
    .default("unknown"),
  isTenantZero: z.boolean().default(false),
  createdAt: z.number().int(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const ActorSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  kind: z.enum(["human", "agent"]),
  name: z.string().min(1),
  createdAt: z.number().int(),
});

export type Actor = z.infer<typeof ActorSchema>;

export const MandateSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  actorId: z.string().uuid(),
  purpose: z.string().min(1),
  maxAmountCents: z.number().int().positive(),
  expiresAt: z.number().int(),
  createdAt: z.number().int(),
});

export type Mandate = z.infer<typeof MandateSchema>;

export const JournalKindSchema = z.enum([
  "checkout.created",
  "checkout.completed",
  "payment.succeeded",
  "payment.failed",
  "account.updated",
  "dispute.created",
  "onboarding.initiated",
  "policy.decided",
]);

export type JournalKind = z.infer<typeof JournalKindSchema>;

export const JournalEntrySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  mandateId: z.string().uuid().optional(),
  kind: JournalKindSchema,
  stripeObjectId: z.string().optional(),
  stripeEventId: z.string().optional(),
  amountCents: z.number().int().optional(),
  currency: z.string().length(3).optional(),
  details: z.record(z.unknown()).default({}),
  createdAt: z.number().int(),
});

export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const InboxEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  processed: z.boolean(),
  payload: z.unknown(),
  receivedAt: z.number().int(),
  processedAt: z.number().int().optional(),
});

export type InboxEvent = z.infer<typeof InboxEventSchema>;

export const LineItemSchema = z.object({
  name: z.string().min(1),
  amountCents: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});

export type LineItem = z.infer<typeof LineItemSchema>;
