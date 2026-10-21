import { requireUser } from "@/lib/services/auth/require-user";
import { evaluateRetrieval } from "@/lib/ai/evaluation/retrieval-eval";
import { retrievalSmokeDataset } from "@/lib/ai/evaluation/datasets/smoke";
import { recordAITrace } from "@/lib/ai/observability/tracing";
export async function POST() {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const started = Date.now();
  try {
    const result = await evaluateRetrieval(user.id, retrievalSmokeDataset.map(item => item.query));
    await recordAITrace({ userId: user.id, operation: "retrieval-evaluation", status: "completed", durationMs: Date.now() - started, metadata: { total: result.total, hitRate: result.hitRate } });
    return Response.json({ ...result, dataset: retrievalSmokeDataset });
  } catch (error) {
    await recordAITrace({ userId: user.id, operation: "retrieval-evaluation", status: "failed", durationMs: Date.now() - started });
    return Response.json({ error: error instanceof Error ? error.message : "Evaluation failed" }, { status: 500 });
  }
}
