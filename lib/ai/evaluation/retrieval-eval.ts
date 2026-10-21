import { searchChunks } from "@/lib/ai/rag/retrieval/search-chunks";
export async function evaluateRetrieval(userId: string, queries: readonly string[] = ["What is the document about?", "List the key facts."]) {
  const results = [];
  for (const query of queries) { const hits = await searchChunks(userId, query, 5); results.push({ query, hitCount: hits.length, topScores: hits.slice(0, 3).map(h => Number(h.score.toFixed(4))), hasRelevantCandidate: hits.some(h => h.score > 0) }); }
  return { total: results.length, hitRate: results.length ? results.filter(r => r.hasRelevantCandidate).length / results.length : 0, results };
}
