import type {
  ChoiceResponse,
  NoulResponse,
  Question,
  Questions,
  ScoreResponse,
  SystemOneResult,
} from "@typesafe-ai/sdk";
import type { JevAskInput, JevPort } from "@/jev/port";

export class MockJev implements JevPort {
  readonly asked: JevAskInput[] = [];
  readonly nextChoice: Record<string, string> = {};
  readonly nextNoul: Record<string, number> = {};
  readonly nextScore: Record<string, number> = {};

  async ask<const Q extends Questions>(
    input: JevAskInput<Q>
  ): Promise<SystemOneResult<Q>> {
    this.asked.push(input);
    const answers = Object.fromEntries(
      Object.entries(input.questions).map(([name, question]) => [
        name,
        this.answer(name, question),
      ])
    );

    return {
      model: "jev-mock",
      answers: answers as SystemOneResult<Q>["answers"],
      usage: { input_tokens: 0, output_tokens: 0 },
    };
  }

  private answer(
    name: string,
    question: Question
  ): NoulResponse | ChoiceResponse | ScoreResponse {
    if (question.type === "noul") {
      return { type: "noul", noul: this.nextNoul[name] ?? 0.95 };
    }

    if (question.type === "choice") {
      const labels = Object.keys(question.criteria);
      const fallback = labels[0] ?? "unknown";
      const requested = this.nextChoice[name];
      const selected =
        requested && labels.includes(requested) ? requested : fallback;
      return {
        type: "choice",
        choice: selected,
        confidence: 0.99,
        probabilities: Object.fromEntries(
          labels.map((label) => [label, label === selected ? 1 : 0])
        ),
      };
    }

    const value = this.nextScore[name] ?? 0;
    const nearest = Math.round(value);
    const legend: Record<string, (typeof question.criteria)[number]> = {};
    const probabilities: Record<string, number> = {};
    question.criteria.forEach((description, index) => {
      legend[String(index)] = description;
      probabilities[String(index)] = index === nearest ? 1 : 0;
    });

    return {
      type: "score",
      score: value,
      confidence: 0.99,
      legend,
      probabilities,
    };
  }
}

export function mockJev(): MockJev {
  return new MockJev();
}
