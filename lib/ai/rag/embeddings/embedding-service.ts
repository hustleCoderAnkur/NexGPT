
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_TIMEOUT_MS = 15_000;

export type EmbeddingTask =
  | "RETRIEVAL_DOCUMENT"
  | "RETRIEVAL_QUERY";

type EmbeddingResponse = {
  embedding?: {
    values?: number[];
  };
  error?: {
    message?: string;
    status?: string;
  };
};

export async function embedText(
  text: string,
  taskType: EmbeddingTask = "RETRIEVAL_DOCUMENT",
): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is missing from the server environment.",
    );
  }

  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error(
      "Cannot generate an embedding for empty text.",
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: {
          parts: [{ text: normalizedText.slice(0, 8000) }],
        },
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
      signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    let providerMessage = "";

    try {
      const parsed: unknown = JSON.parse(errorBody);

      if (
        parsed &&
        typeof parsed === "object" &&
        "error" in parsed
      ) {
        const providerError =
          (parsed as EmbeddingResponse).error;

        providerMessage = providerError?.message ?? "";
      }
    } catch {
      // Ignore non-JSON error bodies.
    }

    console.error("[Embeddings] Google API request failed", {
      status: response.status,
      statusText: response.statusText,
      message: providerMessage.slice(0, 500),
    });

    throw new Error(
      `Google embedding API failed (${response.status}): ${providerMessage || response.statusText || "Unknown provider error"
      }`,
    );
  }

  const data = (await response.json()) as EmbeddingResponse;
  const values = data.embedding?.values;

  if (
    !Array.isArray(values) ||
    values.length !== EMBEDDING_DIMENSIONS ||
    !values.every(Number.isFinite)
  ) {
    throw new Error("Google returned an invalid embedding vector.");
  }

  return values;
}

export function cosineSimilarity(
  a: number[],
  b: number[],
): number {
  if (
    !a.length ||
    a.length !== b.length ||
    !a.every(Number.isFinite) ||
    !b.every(Number.isFinite)
  ) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
