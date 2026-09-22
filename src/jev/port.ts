import type { EntryType, Questions, SystemOneResult } from "@typesafe-ai/sdk";

export const JEV_MODEL = "jev-latest";

export interface JevAskInput<Q extends Questions = Questions> {
  state: EntryType;
  questions: Q;
  model?: string;
}

export interface JevPort {
  ask<const Q extends Questions>(
    input: JevAskInput<Q>
  ): Promise<SystemOneResult<Q>>;
}
