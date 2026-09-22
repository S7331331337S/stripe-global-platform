import { runPhase1Loop } from "../src/agents/run-phase1";

runPhase1Loop().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
