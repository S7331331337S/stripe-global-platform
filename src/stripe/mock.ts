import type {
  CheckoutPort,
  ConnectPort,
  CreateDestinationCheckoutInput,
  CreateRecipientInput,
  CreatedCheckout,
  CreatedRecipient,
  RecipientTransferStatus,
  StripePorts,
} from "@/stripe/ports";

export class MockConnect implements ConnectPort {
  readonly created: CreateRecipientInput[] = [];
  nextStatus: RecipientTransferStatus = "pending";

  async createRecipientAccount(input: CreateRecipientInput): Promise<CreatedRecipient> {
    this.created.push(input);
    if ("type" in (input as object)) {
      throw new Error("v1 account type is not allowed");
    }
    return {
      id: `acct_mock_${this.created.length}`,
      recipientTransferStatus: this.nextStatus,
    };
  }

  async createAccountLink(accountId: string): Promise<{ url: string }> {
    return { url: `https://connect.stripe.com/setup/e/${accountId}` };
  }

  async getRecipientTransferStatus(): Promise<RecipientTransferStatus> {
    return this.nextStatus;
  }
}

export class MockCheckout implements CheckoutPort {
  readonly created: CreateDestinationCheckoutInput[] = [];

  async createDestinationCheckout(
    input: CreateDestinationCheckoutInput
  ): Promise<CreatedCheckout> {
    this.created.push(input);
    return {
      id: `cs_mock_${this.created.length}`,
      url: `https://checkout.stripe.com/c/pay/cs_mock_${this.created.length}`,
    };
  }
}

export function mockStripePorts(): StripePorts & {
  connect: MockConnect;
  checkout: MockCheckout;
} {
  return {
    connect: new MockConnect(),
    checkout: new MockCheckout(),
  };
}
