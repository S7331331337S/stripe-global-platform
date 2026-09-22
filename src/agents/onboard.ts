import type { JevPort } from "@/jev/port";
import type { Ledger } from "@/ledger/store";
import type { ConnectPort } from "@/stripe/ports";
import { onboardAccount } from "@/tools/onboard-account";
import { runAgentLoop, type AgentLoopResult } from "@/agents/loop";

export interface OnboardGoal {
  orgId: string;
  stripeAccountId: string;
  onboardingUrl: string;
}

export async function runOnboardAgent(
  input: { name: string; email: string; country: string; isTenantZero?: boolean },
  deps: { ledger: Ledger; connect: ConnectPort; jev: JevPort }
): Promise<AgentLoopResult<OnboardGoal>> {
  return runAgentLoop({
    name: "onboard",
    maxSteps: 3,
    initial: { done: null as OnboardGoal | null },
    isComplete: (state) => state.done,
    step: async (state) => {
      const result = await onboardAccount(
        {
          name: input.name,
          email: input.email,
          country: input.country,
          isTenantZero: input.isTenantZero ?? false,
        },
        deps
      );
      const done: OnboardGoal = {
        orgId: result.orgId,
        stripeAccountId: result.stripeAccountId,
        onboardingUrl: result.onboardingUrl,
      };
      return {
        tool: "onboard_account",
        input,
        output: result,
        next: { ...state, done },
      };
    },
  });
}
