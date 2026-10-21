export const DEFAULT_BUDGETS = { maxSteps: 5, maxToolCalls: 4, maxOutputTokens: 2048, maxExecutionMs: 45_000, maxToolResultChars: 12_000 } as const;
export function withinBudget(input: { step: number; toolCalls: number; startedAt: number; maxSteps?: number; maxToolCalls?: number; maxExecutionMs?: number }) {
  return input.step < (input.maxSteps ?? DEFAULT_BUDGETS.maxSteps) && input.toolCalls <= (input.maxToolCalls ?? DEFAULT_BUDGETS.maxToolCalls) && Date.now() - input.startedAt < (input.maxExecutionMs ?? DEFAULT_BUDGETS.maxExecutionMs);
}
