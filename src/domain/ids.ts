import { randomBytes, randomUUID } from "crypto";

export function newId(): string {
  return randomUUID();
}

export function integrationIdentifier(prefix: string): string {
  const suffix = randomBytes(4).toString("hex");
  return `${prefix}_${suffix}`;
}

export function now(): number {
  return Date.now();
}
