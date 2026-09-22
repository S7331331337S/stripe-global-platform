export const DEFAULT_PLATFORM_FEE_BPS = 50;
export const STRIPE_PERCENT_BPS = 290;
export const STRIPE_FIXED_CENTS = 30;

export interface FeeQuote {
  amountCents: number;
  platformFeeCents: number;
  stripeEstimateCents: number;
  applicationFeeCents: number;
}

export function estimateStripeFeeCents(amountCents: number): number {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("amountCents must be a positive integer");
  }
  return Math.round((amountCents * STRIPE_PERCENT_BPS) / 10000) + STRIPE_FIXED_CENTS;
}

export function quotePlatformFee(
  amountCents: number,
  platformFeeBps: number = DEFAULT_PLATFORM_FEE_BPS
): FeeQuote {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("amountCents must be a positive integer");
  }
  if (!Number.isInteger(platformFeeBps) || platformFeeBps < 0 || platformFeeBps > 1000) {
    throw new Error("platformFeeBps must be an integer between 0 and 1000");
  }

  const platformFeeCents = Math.round((amountCents * platformFeeBps) / 10000);
  const stripeEstimateCents = estimateStripeFeeCents(amountCents);
  const applicationFeeCents = platformFeeCents + stripeEstimateCents;

  if (applicationFeeCents >= amountCents) {
    throw new Error(
      `application_fee_amount ${applicationFeeCents} must be less than amount ${amountCents}`
    );
  }

  return {
    amountCents,
    platformFeeCents,
    stripeEstimateCents,
    applicationFeeCents,
  };
}

export function sumLineItems(
  items: Array<{ amountCents: number; quantity: number }>
): number {
  return items.reduce((total, item) => {
    if (!Number.isInteger(item.amountCents) || item.amountCents <= 0) {
      throw new Error("line item amountCents must be a positive integer");
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("line item quantity must be a positive integer");
    }
    return total + item.amountCents * item.quantity;
  }, 0);
}
