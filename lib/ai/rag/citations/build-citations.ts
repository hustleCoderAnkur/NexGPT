export type SourceCitation = { index: number; documentId: string; documentName: string; chunkId: string; score: number };
export function buildCitations(citations: SourceCitation[]) { return citations.map(source => ({ ...source, label: `[${source.index}] ${source.documentName}` })); }
