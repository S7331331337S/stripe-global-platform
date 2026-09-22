import type { JevPort } from "@/jev/port";
import type { Ledger } from "@/ledger/store";
import type { StripePorts } from "@/stripe/ports";
import { createCheckout, CreateCheckoutInputSchema } from "@/tools/create-checkout";
import { onboardAccount, OnboardAccountInputSchema } from "@/tools/onboard-account";
import { reconcileEvent, ReconcileEventInputSchema } from "@/tools/reconcile-event";

export const TOOL_NAMES = [
  "onboard_account",
  "create_checkout",
  "reconcile_event",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export interface ToolContext {
  ledger: Ledger;
  ports: StripePorts;
  jev: JevPort;
}

export async function runTool(
  name: ToolName,
  input: unknown,
  ctx: ToolContext
): Promise<unknown> {
  switch (name) {
    case "onboard_account":
      return onboardAccount(OnboardAccountInputSchema.parse(input), {
        ledger: ctx.ledger,
        connect: ctx.ports.connect,
        jev: ctx.jev,
      });
    case "create_checkout":
      return createCheckout(CreateCheckoutInputSchema.parse(input), {
        ledger: ctx.ledger,
        checkout: ctx.ports.checkout,
        jev: ctx.jev,
      });
    case "reconcile_event":
      return reconcileEvent(ReconcileEventInputSchema.parse(input), {
        ledger: ctx.ledger,
        jev: ctx.jev,
      });
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unknown tool: ${_exhaustive}`);
    }
  }
}

export {
  createCheckout,
  onboardAccount,
  reconcileEvent,
  CreateCheckoutInputSchema,
  OnboardAccountInputSchema,
  ReconcileEventInputSchema,
};
