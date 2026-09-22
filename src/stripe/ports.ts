import type { LineItem } from "@/domain/types";

export type RecipientTransferStatus = "active" | "pending" | "inactive" | "unknown";

export interface CreateRecipientInput {
  name: string;
  email: string;
  country: string;
}

export interface CreatedRecipient {
  id: string;
  recipientTransferStatus: RecipientTransferStatus;
}

export interface ConnectPort {
  createRecipientAccount(input: CreateRecipientInput): Promise<CreatedRecipient>;
  createAccountLink(accountId: string): Promise<{ url: string }>;
  getRecipientTransferStatus(accountId: string): Promise<RecipientTransferStatus>;
}

export interface CreateDestinationCheckoutInput {
  connectedAccountId: string;
  applicationFeeCents: number;
  currency: string;
  items: LineItem[];
  metadata: {
    org_id: string;
    actor_id: string;
    mandate_id: string;
    purpose: string;
  };
  successUrl: string;
  cancelUrl: string;
}

export interface CreatedCheckout {
  id: string;
  url: string | null;
}

export interface CheckoutPort {
  createDestinationCheckout(
    input: CreateDestinationCheckoutInput
  ): Promise<CreatedCheckout>;
}

export interface StripePorts {
  connect: ConnectPort;
  checkout: CheckoutPort;
}
