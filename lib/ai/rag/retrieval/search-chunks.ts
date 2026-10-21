import { prisma } from "@/lib/db";
import { cosineSimilarity, embedText } from "@/lib/ai/rag/embeddings/embedding-service";

export type RetrievedChunk = { id: string; documentId: string; documentName: string; ordinal: number; content: string; score: number };

function lexicalScore(query: string, content: string) {
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])];
  if (!terms.length) return 0;
  const haystack = content.toLowerCase();
  return terms.reduce((n, term) => n + (haystack.includes(term) ? 1 : 0), 0) / terms.length;
}

export async function searchChunks(userId: string, query: string, limit = 5): Promise<RetrievedChunk[]> {
  const docs = await prisma.document.findMany({
    where: { userId, status: "READY" },
    select: { id: true, name: true, chunks: { select: { id: true, ordinal: true, content: true, embedding: true }, orderBy: { ordinal: "asc" } } },
    take: 100,
  });
  const all = docs.flatMap(doc => doc.chunks.map(chunk => ({ ...chunk, documentId: doc.id, documentName: doc.name })));
  if (!all.length) return [];
  let queryEmbedding: number[] | null = null;
  try { queryEmbedding = await embedText(query); } catch (error) { console.error("[RAG] Query embedding failed; using lexical retrieval", error instanceof Error ? error.message : "unknown"); }
  return all.map(chunk => {
    const vector = Array.isArray(chunk.embedding) && chunk.embedding.every(v => typeof v === "number") ? chunk.embedding as number[] : null;
    const vectorScore = queryEmbedding && vector ? cosineSimilarity(queryEmbedding, vector) : 0;
    const lexical = lexicalScore(query, chunk.content);
    return { id: chunk.id, documentId: chunk.documentId, documentName: chunk.documentName, ordinal: chunk.ordinal, content: chunk.content, score: queryEmbedding ? (vector ? vectorScore * 0.8 + lexical * 0.2 : lexical) : lexical };
  }).sort((a,b) => b.score-a.score).slice(0, Math.max(1, Math.min(limit, 10)));
}
