import type { Ledger } from "@/ledger/store";
import type { StripeLikeEvent } from "@/stripe/webhooks";
import { reconcileEvent } from "@/tools/reconcile-event";
import { runAgentLoop, type AgentLoopResult } from "@/agents/loop";

export interface ReconcileGoal {
  processed: number;
}

export async function runReconcileAgent(
  events: StripeLikeEvent[],
  deps: { ledger: Ledger }
): Promise<AgentLoopResult<ReconcileGoal>> {
  let cursor = 0;

  return runAgentLoop({
    name: "reconcile",
    maxSteps: Math.max(events.length + 1, 1),
    initial: { processed: 0 },
    isComplete: (state) => {
      const pending = deps.ledger.listUnprocessedInbox();
      if (cursor >= events.length && pending.length === 0) {
        return { processed: state.processed };
      }
      return null;
    },
    step: async (state) => {
      const nextEvent = events[cursor];
      if (!nextEvent) {
        throw new Error("reconcile has no event but inbox is not empty");
      }
      cursor += 1;
      const output = reconcileEvent({ event: nextEvent }, deps);
      return {
        tool: "reconcile_event",
        input: { eventId: nextEvent.id, type: nextEvent.type },
        output,
        next: { processed: state.processed + (output.inserted ? 1 : 0) },
      };
    },
  });
}
