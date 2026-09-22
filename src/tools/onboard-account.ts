import { z } from "zod";
import type { Ledger } from "@/ledger/store";
import type { ConnectPort } from "@/stripe/ports";

export const OnboardAccountInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  country: z.string().length(2),
  actorName: z.string().min(1).default("platform-agent"),
  isTenantZero: z.boolean().default(false),
});

export type OnboardAccountInput = z.input<typeof OnboardAccountInputSchema>;

export interface OnboardAccountResult {
  orgId: string;
  actorId: string;
  stripeAccountId: string;
  onboardingUrl: string;
  recipientTransferStatus: string;
}

export async function onboardAccount(
  input: OnboardAccountInput,
  deps: { ledger: Ledger; connect: ConnectPort }
): Promise<OnboardAccountResult> {
  const parsed = OnboardAccountInputSchema.parse(input);
  const country = parsed.country.toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new Error("country must be a 2-letter ISO code");
  }

  const org = deps.ledger.createOrganization({
    name: parsed.name,
    email: parsed.email,
    country,
    isTenantZero: parsed.isTenantZero,
  });

  const actor = deps.ledger.createActor({
    orgId: org.id,
    kind: "agent",
    name: parsed.actorName,
  });

  const account = await deps.connect.createRecipientAccount({
    name: parsed.name,
    email: parsed.email,
    country,
  });

  const link = await deps.connect.createAccountLink(account.id);

  deps.ledger.updateOrganization(org.id, {
    stripeAccountId: account.id,
    onboardingUrl: link.url,
    recipientTransferStatus: account.recipientTransferStatus,
  });

  deps.ledger.appendJournal({
    orgId: org.id,
    actorId: actor.id,
    kind: "onboarding.initiated",
    stripeObjectId: account.id,
    details: { email: parsed.email, country },
  });

  return {
    orgId: org.id,
    actorId: actor.id,
    stripeAccountId: account.id,
    onboardingUrl: link.url,
    recipientTransferStatus: account.recipientTransferStatus,
  };
}
