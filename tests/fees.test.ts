import { describe, expect, it } from "vitest";
import { quotePlatformFee, sumLineItems } from "@/domain/fees";

describe("fee quote", () => {
  it("adds platform bps to the Stripe estimate", () => {
    const quote = quotePlatformFee(2000, 50);
    expect(quote.platformFeeCents).toBe(10);
    expect(quote.stripeEstimateCents).toBe(88);
    expect(quote.applicationFeeCents).toBe(98);
  });

  it("rejects a fee that would consume the charge", () => {
    expect(() => quotePlatformFee(50, 50)).toThrow(/must be less than amount/);
  });

  it("sums line items", () => {
    expect(
      sumLineItems([
        { amountCents: 2000, quantity: 2 },
        { amountCents: 4500, quantity: 1 },
      ])
    ).toBe(8500);
  });
});
