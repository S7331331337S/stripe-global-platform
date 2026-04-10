// src/lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

// Initialize Stripe with API version
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
  typescript: true,
});

/**
 * Create a Stripe Express Connected Account for a company
 */
export async function createExpressAccount(companyData: {
  name: string;
  email: string;
  country: string;
  websiteUrl?: string;
}) {
  try {
    const account = await stripe.accounts.create({
      type: "express",
      country: companyData.country,
      email: companyData.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: companyData.name,
        url: companyData.websiteUrl || process.env.APP_URL,
        product_description: `Payment processing via ${companyData.name}`,
        mcc: "7299",
      },
    });

    console.log(`✅ Created Express account: ${account.id}`);
    return account.id;
  } catch (error) {
    console.error("❌ Failed to create Express account:", error);
    throw error;
  }
}

/**
 * Generate an onboarding link for a company
 */
export async function generateOnboardingLink(stripeAccountId: string) {
  try {
    const link = await stripe.accounts.createAccountLink(stripeAccountId, {
      type: "account_onboarding",
      refresh_url: `${process.env.APP_URL}/onboarding/refresh`,
      return_url: `${process.env.APP_URL}/onboarding/success`,
    });

    return link.url;
  } catch (error) {
    console.error("❌ Failed to generate onboarding link:", error);
    throw error;
  }
}

/**
 * Check if an account is ready for payments and payouts
 */
export async function checkAccountStatus(stripeAccountId: string) {
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);

    return {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      country: account.country,
      email: account.email,
      verificationStatus: account.verification?.status,
    };
  } catch (error) {
    console.error("❌ Failed to check account status:", error);
    throw error;
  }
}

/**
 * Create a Payment Intent for a company
 */
export async function createPaymentIntent(
  stripeAccountId: string,
  amountCents: number,
  currency: string,
  customerEmail: string,
  platformFeeCents: number
) {
  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        customer_email: customerEmail,
        statement_descriptor: "PLATFORM PAYMENT",
        application_fee_amount: platformFeeCents,
      },
      { stripeAccount: stripeAccountId }
    );

    return {
      clientSecret: paymentIntent.client_secret,
      intentId: paymentIntent.id,
    };
  } catch (error) {
    console.error("❌ Failed to create Payment Intent:", error);
    throw error;
  }
}

/**
 * Get account balance
 */
export async function getAccountBalance(stripeAccountId: string) {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    return balance.available[0];
  } catch (error) {
    console.error("❌ Failed to get account balance:", error);
    throw error;
  }
}

/**
 * Create a payout for a company
 */
export async function createPayout(
  stripeAccountId: string,
  amountCents: number,
  currency: string,
  bankAccountId: string
) {
  try {
    const payout = await stripe.payouts.create(
      {
        amount: amountCents,
        currency: currency.toLowerCase(),
        destination: bankAccountId,
        description: `Automated payout`,
      },
      { stripeAccount: stripeAccountId }
    );

    return payout;
  } catch (error) {
    console.error("❌ Failed to create payout:", error);
    throw error;
  }
}

/**
 * List charges for a connected account
 */
export async function listCharges(
  stripeAccountId: string,
  options?: Stripe.ChargeListParams
) {
  try {
    const charges = await stripe.charges.list(
      {
        limit: 100,
        ...options,
      },
      { stripeAccount: stripeAccountId }
    );

    return charges;
  } catch (error) {
    console.error("❌ Failed to list charges:", error);
    throw error;
  }
}

/**
 * Retrieve a dispute
 */
export async function getDispute(disputeId: string) {
  try {
    const dispute = await stripe.disputes.retrieve(disputeId);
    return dispute;
  } catch (error) {
    console.error("❌ Failed to retrieve dispute:", error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): Stripe.Event {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error("❌ Webhook signature verification failed:", error);
    throw error;
  }
}
