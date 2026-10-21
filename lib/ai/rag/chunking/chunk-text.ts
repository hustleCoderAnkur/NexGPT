export type TextChunk = { ordinal: number; content: string; tokenCount: number };

/** Split on paragraph/sentence boundaries where possible, with bounded overlap. */
export function chunkText(text: string, maxChars = 1400, overlap = 180): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];
  const chunks: TextChunk[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);
    if (end < normalized.length) {
      const boundary = Math.max(normalized.lastIndexOf("\n", end), normalized.lastIndexOf(". ", end));
      if (boundary > start + Math.floor(maxChars * 0.55)) end = boundary + 1;
    }
    const content = normalized.slice(start, end).trim();
    if (content) chunks.push({ ordinal: chunks.length, content, tokenCount: Math.ceil(content.length / 4) });
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}
