import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { Questions, SystemOneResult } from "@typesafe-ai/sdk";
import { JEV_MODEL, type JevAskInput, type JevPort } from "@/jev/port";

let client: TypeSafeClient | null = null;

export function getTypeSafeClient(): TypeSafeClient {
  if (client) {
    return client;
  }

  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error("TYPESAFE_API_KEY is not configured");
  }

  client = new TypeSafeClient({
    apiKey,
    defaultModel: process.env.TYPESAFE_DEFAULT_MODEL ?? JEV_MODEL,
    baseURL: process.env.TYPESAFE_BASE_URL,
  });
  return client;
}

export function resetTypeSafeClient(): void {
  client = null;
}

export class TypeSafeJev implements JevPort {
  constructor(
    private readonly resolveClient: () => TypeSafeClient = getTypeSafeClient
  ) {}

  async ask<const Q extends Questions>(
    input: JevAskInput<Q>
  ): Promise<SystemOneResult<Q>> {
    return this.resolveClient().systemOne({
      state: input.state,
      questions: input.questions,
      model: input.model ?? JEV_MODEL,
    });
  }
}

export function createJevFromEnv(): JevPort {
  return new TypeSafeJev();
}
