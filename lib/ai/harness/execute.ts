import { DEFAULT_BUDGETS, withinBudget } from "@/lib/ai/harness/budgets";
import { transitionState, type AgentState } from "@/lib/ai/harness/state-machine";

export type LoopStep<T> = { type: "continue"; value: T } | { type: "complete"; value: T };
/** Generic bounded execution loop. The caller supplies a single step of model/tool work. */
export async function executeBoundedLoop<T>(input: { maxSteps?: number; maxToolCalls?: number; maxExecutionMs?: number; signal?: AbortSignal; step: (context: { step: number; toolCalls: number; signal?: AbortSignal }) => Promise<LoopStep<T>> }) {
  const startedAt = Date.now(); let state: AgentState = "idle"; let toolCalls = 0; let lastValue: T | undefined;
  state = transitionState(state, "running");
  for (let step = 0; step < (input.maxSteps ?? DEFAULT_BUDGETS.maxSteps); step++) {
    if (input.signal?.aborted) { state = transitionState(state, "cancelled"); break; }
    if (!withinBudget({ step, toolCalls, startedAt, maxSteps: input.maxSteps, maxToolCalls: input.maxToolCalls, maxExecutionMs: input.maxExecutionMs })) { state = transitionState(state, "budget_exceeded"); break; }
    try {
      const result = await input.step({ step, toolCalls, signal: input.signal }); lastValue = result.value;
      if (result.type === "complete") { state = transitionState(state, "completed"); break; }
      toolCalls++;
      if (step === (input.maxSteps ?? DEFAULT_BUDGETS.maxSteps) - 1) state = transitionState(state, "budget_exceeded");
    } catch (error) { state = transitionState(state, "failed"); throw error; }
  }
  return { state, value: lastValue, steps: Math.min((input.maxSteps ?? DEFAULT_BUDGETS.maxSteps), toolCalls + 1), durationMs: Date.now() - startedAt };
}
