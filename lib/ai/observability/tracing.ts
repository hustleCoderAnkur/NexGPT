import { prisma } from "@/lib/db";
export async function recordAITrace(input: { userId: string; conversationId?: string; operation: string; provider?: string; modelId?: string; status: string; durationMs?: number; inputTokens?: number; outputTokens?: number; metadata?: Record<string, unknown> }) {
  try { await prisma.aITrace.create({ data: { ...input, metadata: input.metadata as never } }); }
  catch (error) { console.error("[AI trace] Could not persist trace", error instanceof Error ? error.message : "unknown"); }
}
