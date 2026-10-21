
import { prisma } from "@/lib/db";
import { chunkText } from "@/lib/ai/rag/chunking/chunk-text";
import { parseDocument } from "@/lib/ai/rag/ingestion/parse-document";
import { embedText } from "@/lib/ai/rag/embeddings/embedding-service";

const MAX_CHUNKS = 10_000;

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Document processing failed.";
}

export async function ingestDocument(
  documentId: string,
  file: File,
) {
  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "PROCESSING",
      error: null,
    },
  });

  try {
    // 1. Extract text from the uploaded file.
    const text = await parseDocument(file);

    if (!text || !text.trim()) {
      throw new Error(
        `No readable text could be extracted from "${file.name}". ` +
        "The file may be scanned, empty, encrypted, or unsupported.",
      );
    }

    // 2. Split extracted text into searchable chunks.
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error("No text chunks could be extracted.");
    }

    if (chunks.length > MAX_CHUNKS) {
      throw new Error(
        `Document generated too many chunks (${chunks.length}). ` +
        `The maximum allowed is ${MAX_CHUNKS}.`,
      );
    }

    // 3. Generate embeddings.
    // Keep ingestion functional when the embedding provider is unavailable.
    const rows: Array<{
      documentId: string;
      ordinal: number;
      content: string;
      tokenCount: number;
      embedding?: number[];
    }> = [];

    let embeddingsSucceeded = 0;
    let embeddingsFailed = 0;

    for (const chunk of chunks) {
      let embedding: number[] | null = null;

      try {
        embedding = await embedText(chunk.content);

        if (embedding && embedding.length > 0) {
          embeddingsSucceeded++;
        } else {
          embedding = null;
          embeddingsFailed++;
        }
      } catch (error) {
        embeddingsFailed++;

        console.error("[RAG] Embedding generation failed", {
          documentId,
          ordinal: chunk.ordinal,
          message: getErrorMessage(error),
        });
      }

      rows.push({
        documentId,
        ordinal: chunk.ordinal,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
        ...(embedding ? { embedding } : {}),
      });
    }

    // 4. Replace existing chunks only after extraction succeeds.
    // Use a transaction so partial chunk writes are rolled back.
    await prisma.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({
        where: { documentId },
      });

      // Insert in batches to avoid oversized database queries.
      const BATCH_SIZE = 100;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        await tx.documentChunk.createMany({
          data: rows.slice(i, i + BATCH_SIZE),
        });
      }

      await tx.document.update({
        where: { id: documentId },
        data: {
          status: "READY",
          error:
            embeddingsFailed > 0
              ? `${embeddingsFailed} chunk(s) could not be embedded. Keyword retrieval may still work.`
              : null,
        },
      });
    });

    return {
      chunkCount: chunks.length,
      embeddingsEnabled: embeddingsSucceeded > 0,
      embeddingsSucceeded,
      embeddingsFailed,
    };
  } catch (error) {
    const message = getErrorMessage(error);

    console.error("[RAG] Document ingestion failed", {
      documentId,
      filename: file.name,
      message,
    });

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        error: message.slice(0, 500),
      },
    }).catch((updateError) => {
      console.error(
        "[RAG] Failed to update document status",
        updateError,
      );
    });

    throw error;
  }
}
