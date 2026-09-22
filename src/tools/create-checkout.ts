import { z } from "zod";
import { quotePlatformFee, sumLineItems } from "@/domain/fees";
import { LineItemSchema } from "@/domain/types";
import type { Ledger } from "@/ledger/store";
import type { CheckoutPort } from "@/stripe/ports";

export const CreateCheckoutInputSchema = z.object({
  orgId: z.string().uuid(),
  actorId: z.string().uuid(),
  mandateId: z.string().uuid(),
  currency: z.string().length(3).default("usd"),
  items: z.array(LineItemSchema).min(1),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type CreateCheckoutToolInput = z.input<typeof CreateCheckoutInputSchema>;

export interface CreateCheckoutResult {
  checkoutId: string;
  url: string | null;
  amountCents: number;
  applicationFeeCents: number;
}

export async function createCheckout(
  input: CreateCheckoutToolInput,
  deps: { ledger: Ledger; checkout: CheckoutPort }
): Promise<CreateCheckoutResult> {
  const parsed = CreateCheckoutInputSchema.parse(input);
  const org = deps.ledger.getOrganization(parsed.orgId);
  if (!org) {
    throw new Error("Organization not found");
  }
  if (!org.stripeAccountId) {
    throw new Error("Organization has not completed Connect onboarding");
  }
  if (org.recipientTransferStatus !== "active") {
    throw new Error(
      `Recipient transfers are not active (${org.recipientTransferStatus})`
    );
  }

  const actor = deps.ledger.getActor(parsed.actorId);
  if (!actor || actor.orgId !== org.id) {
    throw new Error("Actor not found on organization");
  }

  const mandate = deps.ledger.getMandate(parsed.mandateId);
  if (!mandate || mandate.orgId !== org.id || mandate.actorId !== actor.id) {
    throw new Error("Mandate not found for actor");
  }
  if (mandate.expiresAt <= Date.now()) {
    throw new Error("Mandate has expired");
  }

  const amountCents = sumLineItems(parsed.items);
  if (amountCents > mandate.maxAmountCents) {
    throw new Error(
      `Amount ${amountCents} exceeds mandate max ${mandate.maxAmountCents}`
    );
  }

  const fee = quotePlatformFee(amountCents, org.platformFeeBps);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const session = await deps.checkout.createDestinationCheckout({
    connectedAccountId: org.stripeAccountId,
    applicationFeeCents: fee.applicationFeeCents,
    currency: parsed.currency,
    items: parsed.items,
    metadata: {
      org_id: org.id,
      actor_id: actor.id,
      mandate_id: mandate.id,
      purpose: mandate.purpose,
    },
    successUrl: parsed.successUrl ?? `${appUrl}/checkout/success`,
    cancelUrl: parsed.cancelUrl ?? `${appUrl}/checkout/cancel`,
  });

  deps.ledger.appendJournal({
    orgId: org.id,
    actorId: actor.id,
    mandateId: mandate.id,
    kind: "checkout.created",
    stripeObjectId: session.id,
    amountCents,
    currency: parsed.currency.toUpperCase(),
    details: {
      applicationFeeCents: fee.applicationFeeCents,
      url: session.url,
    },
  });

  return {
    checkoutId: session.id,
    url: session.url,
    amountCents,
    applicationFeeCents: fee.applicationFeeCents,
  };
}
