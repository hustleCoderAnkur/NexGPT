export type TokenBudget = { maxContextTokens: number; maxOutputTokens: number; reservedTokens: number };
export function estimateTokens(text: string) { return Math.ceil(text.length / 4); }
export function fitContext<T extends { content: string }>(items: T[], budget: number): T[] {
  let used = 0; const selected: T[] = [];
  for (const item of items) { const cost = estimateTokens(item.content); if (used + cost > budget) continue; selected.push(item); used += cost; }
  return selected;
}
