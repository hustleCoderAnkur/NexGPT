import { retrieveContext } from "@/lib/ai/rag/retrieval/retrieval-service";
export async function searchUserDocuments(userId: string, query: string, limit = 5) {
  if (!query.trim() || query.length > 2000) throw new Error("A valid search query is required.");
  return retrieveContext(userId, query, limit);
}
