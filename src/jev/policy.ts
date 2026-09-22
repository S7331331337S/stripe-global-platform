import {
  choice,
  noul,
  score,
  type JsonValue,
  type Questions,
  type SystemOneResult,
} from "@typesafe-ai/sdk";
import type { JevPort } from "@/jev/port";

export const CHECKOUT_NOUL_MIN = 0.5;
export const CHECKOUT_RISK_MAX = 1.5;
export const ONBOARD_NOUL_MIN = 0.5;

export type PolicyDecision =
  | "proceed"
  | "reject"
  | "review"
  | "project"
  | "escalate";

export interface PolicyVerdict {
  model: string;
  decision: PolicyDecision;
  reason: string;
  answers: Record<string, unknown>;
}

export interface CheckoutPolicyState {
  [key: string]: JsonValue;
  tool: "create_checkout";
  orgId: string;
  actorId: string;
  mandateId: string;
  purpose: string;
  amountCents: number;
  mandateMaxCents: number;
  currency: string;
  recipientTransferStatus: string;
  platformFeeBps: number;
  applicationFeeCents: number;
  itemCount: number;
}

export interface OnboardPolicyState {
  [key: string]: JsonValue;
  tool: "onboard_account";
  name: string;
  email: string;
  country: string;
  isTenantZero: boolean;
}

export interface ReconcilePolicyState {
  [key: string]: JsonValue;
  tool: "reconcile_event";
  eventId: string;
  eventType: string;
  knownKind: string | null;
}

export function checkoutQuestions() {
  return {
    action: choice("Should this destination checkout proceed?", {
      proceed:
        "Create the Checkout Session. Amount is within mandate and recipient transfers are active.",
      reject:
        "Do not create the session. Amount, recipient, or purpose is not allowed.",
      review: "Hold for a human. Signals are mixed.",
    }),
    withinMandate: noul(
      "Is this charge within the actor mandate and allowed for the recipient?",
      {
        true: "Amount, purpose, and recipient transfers are valid.",
        false:
          "The mandate, amount, or recipient capability does not allow this charge.",
      }
    ),
    risk: score("How risky is this checkout?", [
      "No material risk. Routine catalog purchase.",
      "Elevated risk. Review recommended.",
      "High risk. Do not proceed automatically.",
    ]),
  };
}

export function onboardQuestions() {
  return {
    proceed: noul(
      "Should we create a recipient connected account for this organization?",
      {
        true: "Country, email, and recipient shape are acceptable.",
        false: "Do not open a connected account for this organization.",
      }
    ),
  };
}

export function reconcileQuestions() {
  return {
    action: choice("How should this Stripe event be handled?", {
      project: "Project into the journal. The event is known and safe.",
      escalate:
        "Do not project a business fact. Record the decision and leave it for review.",
    }),
  };
}

export function serializeAnswers(
  answers: SystemOneResult<Questions>["answers"]
): Record<string, unknown> {
  const recorded: Record<string, unknown> = {};
  for (const [name, answer] of Object.entries(answers)) {
    switch (answer.type) {
      case "noul":
        recorded[name] = { type: "noul", noul: answer.noul };
        break;
      case "choice":
        recorded[name] = {
          type: "choice",
          choice: answer.choice,
          confidence: answer.confidence,
          probabilities: answer.probabilities,
        };
        break;
      case "score":
        recorded[name] = {
          type: "score",
          score: answer.score,
          confidence: answer.confidence,
        };
        break;
      default: {
        const _exhaustive: never = answer;
        throw new Error(`Unknown Jev answer: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }
  return recorded;
}

export async function decideCheckout(
  jev: JevPort,
  state: CheckoutPolicyState
): Promise<PolicyVerdict> {
  const result = await jev.ask({ state, questions: checkoutQuestions() });
  const answers = serializeAnswers(result.answers);
  const action = result.answers.action.choice;

  if (action === "reject") {
    return {
      model: result.model,
      decision: "reject",
      reason: "Jev rejected checkout",
      answers,
    };
  }

  if (action === "review") {
    return {
      model: result.model,
      decision: "review",
      reason: "Jev requested review of checkout",
      answers,
    };
  }

  if (result.answers.withinMandate.noul < CHECKOUT_NOUL_MIN) {
    return {
      model: result.model,
      decision: "reject",
      reason: "Jev is not confident this checkout is within mandate",
      answers,
    };
  }

  if (result.answers.risk.score >= CHECKOUT_RISK_MAX) {
    return {
      model: result.model,
      decision: "reject",
      reason: "Jev scored checkout risk too high",
      answers,
    };
  }

  return {
    model: result.model,
    decision: "proceed",
    reason: "Jev approved checkout",
    answers,
  };
}

export async function decideOnboard(
  jev: JevPort,
  state: OnboardPolicyState
): Promise<PolicyVerdict> {
  const result = await jev.ask({ state, questions: onboardQuestions() });
  const answers = serializeAnswers(result.answers);

  if (result.answers.proceed.noul < ONBOARD_NOUL_MIN) {
    return {
      model: result.model,
      decision: "reject",
      reason: "Jev rejected onboarding",
      answers,
    };
  }

  return {
    model: result.model,
    decision: "proceed",
    reason: "Jev approved onboarding",
    answers,
  };
}

export async function decideReconcile(
  jev: JevPort,
  state: ReconcilePolicyState
): Promise<PolicyVerdict> {
  const result = await jev.ask({ state, questions: reconcileQuestions() });
  const answers = serializeAnswers(result.answers);
  const action = result.answers.action.choice;

  if (action === "escalate") {
    return {
      model: result.model,
      decision: "escalate",
      reason: `Jev escalated event ${state.eventId}`,
      answers,
    };
  }

  return {
    model: result.model,
    decision: "project",
    reason: "Jev approved event projection",
    answers,
  };
}
