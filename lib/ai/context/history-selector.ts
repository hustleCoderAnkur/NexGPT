import type { UIMessage } from "ai";
import { isTextUIPart } from "ai";
import { estimateTokens } from "@/lib/ai/context/token-budget";
export function selectRecentHistory(messages: UIMessage[], maxTokens = 6000): UIMessage[] {
  const chosen: UIMessage[] = []; let used = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    const text = message.parts.filter(isTextUIPart).map(p => p.text).join(" ");
    const cost = estimateTokens(text);
    if (used + cost > maxTokens && chosen.length) break;
    chosen.unshift(message); used += cost;
  }
  return chosen;
}
