import type { Ledger } from "@/ledger/store";
import type { CheckoutPort } from "@/stripe/ports";
import { createCheckout } from "@/tools/create-checkout";
import { runAgentLoop, type AgentLoopResult } from "@/agents/loop";
import type { LineItem } from "@/domain/types";

export interface CheckoutGoal {
  checkoutId: string;
  journalId: string;
}

export async function runCheckoutAgent(
  input: {
    orgId: string;
    actorId: string;
    mandateId: string;
    items: LineItem[];
  },
  deps: { ledger: Ledger; checkout: CheckoutPort }
): Promise<AgentLoopResult<CheckoutGoal>> {
  return runAgentLoop({
    name: "checkout",
    maxSteps: 3,
    initial: { done: null as CheckoutGoal | null },
    isComplete: (state) => {
      if (state.done) return state.done;
      const created = deps.ledger.listJournal({
        mandateId: input.mandateId,
        kind: "checkout.created",
      });
      const entry = created[0];
      if (entry?.stripeObjectId) {
        return { checkoutId: entry.stripeObjectId, journalId: entry.id };
      }
      return null;
    },
    step: async (state) => {
      const result = await createCheckout(
        {
          orgId: input.orgId,
          actorId: input.actorId,
          mandateId: input.mandateId,
          items: input.items,
        },
        deps
      );
      const journal = deps.ledger.listJournal({
        mandateId: input.mandateId,
        kind: "checkout.created",
      })[0];
      if (!journal) {
        throw new Error("checkout.created journal entry missing after tool");
      }
      return {
        tool: "create_checkout",
        input,
        output: result,
        next: {
          ...state,
          done: { checkoutId: result.checkoutId, journalId: journal.id },
        },
      };
    },
  });
}
