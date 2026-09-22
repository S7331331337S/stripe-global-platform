import { integrationIdentifier } from "@/domain/ids";
import { getStripe } from "@/stripe/client";
import type {
  CheckoutPort,
  CreateDestinationCheckoutInput,
  CreatedCheckout,
} from "@/stripe/ports";

export const stripeCheckout: CheckoutPort = {
  async createDestinationCheckout(
    input: CreateDestinationCheckoutInput
  ): Promise<CreatedCheckout> {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      line_items: input.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: item.amountCents,
          product_data: { name: item.name },
        },
      })),
      payment_intent_data: {
        application_fee_amount: input.applicationFeeCents,
        transfer_data: {
          destination: input.connectedAccountId,
        },
      },
      metadata: input.metadata,
      integration_identifier: integrationIdentifier("mstrmnd_dest"),
    });

    return {
      id: session.id,
      url: session.url,
    };
  },
};
