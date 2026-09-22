import { getStripe } from "@/stripe/client";
import type {
  ConnectPort,
  CreateRecipientInput,
  CreatedRecipient,
  RecipientTransferStatus,
} from "@/stripe/ports";

interface V2Accounts {
  create: (params: Record<string, unknown>) => Promise<{ id: string }>;
  retrieve: (id: string) => Promise<unknown>;
}

function v2Accounts(): V2Accounts {
  const stripe = getStripe() as unknown as {
    v2?: { core?: { accounts?: V2Accounts } };
  };
  const accounts = stripe.v2?.core?.accounts;
  if (!accounts) {
    throw new Error("Stripe SDK is missing v2.core.accounts — upgrade the stripe package");
  }
  return accounts;
}

export function readRecipientStatus(account: unknown): RecipientTransferStatus {
  if (typeof account !== "object" || account === null) {
    return "unknown";
  }

  const configuration = (account as { configuration?: unknown }).configuration;
  if (typeof configuration !== "object" || configuration === null) {
    return "unknown";
  }

  const recipient = (configuration as { recipient?: unknown }).recipient;
  if (typeof recipient !== "object" || recipient === null) {
    return "unknown";
  }

  const capabilities = (recipient as { capabilities?: unknown }).capabilities;
  if (typeof capabilities !== "object" || capabilities === null) {
    return "unknown";
  }

  const stripeBalance = (capabilities as { stripe_balance?: unknown }).stripe_balance;
  if (typeof stripeBalance !== "object" || stripeBalance === null) {
    return "unknown";
  }

  const transfers = (stripeBalance as { stripe_transfers?: unknown }).stripe_transfers;
  if (typeof transfers !== "object" || transfers === null) {
    return "unknown";
  }

  const status = (transfers as { status?: unknown }).status;
  if (status === "active" || status === "pending" || status === "inactive") {
    return status;
  }
  return "unknown";
}

export const stripeConnect: ConnectPort = {
  async createRecipientAccount(input: CreateRecipientInput): Promise<CreatedRecipient> {
    const country = input.country.toUpperCase();
    const account = await v2Accounts().create({
      display_name: input.name,
      contact_email: input.email,
      identity: { country },
      dashboard: "express",
      defaults: {
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
    });

    return {
      id: account.id,
      recipientTransferStatus: readRecipientStatus(account),
    };
  },

  async createAccountLink(accountId: string): Promise<{ url: string }> {
    const stripe = getStripe();
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${appUrl}/onboarding/refresh`,
      return_url: `${appUrl}/onboarding/success`,
    });
    return { url: link.url };
  },

  async getRecipientTransferStatus(accountId: string): Promise<RecipientTransferStatus> {
    const account = await v2Accounts().retrieve(accountId);
    return readRecipientStatus(account);
  },
};
