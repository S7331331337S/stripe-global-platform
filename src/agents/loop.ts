export interface AgentStep {
  tool: string;
  input: unknown;
  output?: unknown;
  error?: string;
}

export interface AgentLoopResult<TGoal> {
  complete: boolean;
  steps: AgentStep[];
  goal?: TGoal;
  error?: string;
}

export interface RunLoopOptions<TState, TGoal> {
  name: string;
  maxSteps: number;
  initial: TState;
  isComplete: (state: TState) => TGoal | null;
  step: (state: TState) => Promise<{
    tool: string;
    input: unknown;
    next: TState;
    output?: unknown;
  }>;
}

export async function runAgentLoop<TState, TGoal>(
  options: RunLoopOptions<TState, TGoal>
): Promise<AgentLoopResult<TGoal>> {
  const steps: AgentStep[] = [];
  let state = options.initial;

  const already = options.isComplete(state);
  if (already) {
    return { complete: true, steps, goal: already };
  }

  for (let i = 0; i < options.maxSteps; i += 1) {
    try {
      const result = await options.step(state);
      steps.push({
        tool: result.tool,
        input: result.input,
        output: result.output,
      });
      state = result.next;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      steps.push({
        tool: "unknown",
        input: null,
        error: message,
      });
      return { complete: false, steps, error: message };
    }

    const goal = options.isComplete(state);
    if (goal) {
      return { complete: true, steps, goal };
    }
  }

  return {
    complete: false,
    steps,
    error: `${options.name} hit max steps (${options.maxSteps}) without completing`,
  };
}
