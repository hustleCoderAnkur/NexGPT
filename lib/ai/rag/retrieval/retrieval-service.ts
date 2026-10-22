
import { searchChunks } from "@/lib/ai/rag/retrieval/search-chunks";

export async function retrieveContext(
  userId: string,
  query: string,
  limit = 5,
  documentIds?: string[],
) {
  const chunks = await searchChunks(
    userId,
    query,
    limit,
    documentIds,
  );

  const selected = chunks
    .filter((chunk) => chunk.score > 0)
    .slice(0, limit);

  return {
    chunks: selected,

    context: selected
      .map(
        (chunk, i) =>
          `[Source ${i + 1}: ${chunk.documentName}, chunk ${chunk.ordinal + 1}]\n${chunk.content}`,
      )
      .join("\n\n---\n\n"),

    citations: selected.map((chunk, i) => ({
      index: i + 1,
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      chunkId: chunk.id,
      score: Number(chunk.score.toFixed(4)),
    })),
  };
}
