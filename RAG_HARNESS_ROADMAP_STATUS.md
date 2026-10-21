# Implementation status and validation checklist

## Implemented in this bundle
- Document API routes protected by `requireUser()` and scoped to the authenticated user.
- Upload and ingestion for TXT, Markdown, CSV, JSON, and XML with a 2 MB limit.
- Chunking, optional Google embeddings, lexical fallback, user-scoped retrieval, and citation event emission in chat.
- Context selection and approximate token budget utilities.
- Agent state transitions, execution budget checks, tool registry/policy primitives, and safe calculator.
- Retrieval smoke evaluation route/page and best-effort trace persistence.
- Sidebar navigation to Documents, Evaluation lab, and AI settings.
- Prisma models and SQL migration for documents, chunks, and traces.

## Not represented as complete yet
- PDF/DOCX parsing and durable object storage.
- Background queue and retryable asynchronous ingestion.
- pgvector indexes/hybrid retrieval/reranking.
- Model-driven autonomous tool dispatch in the chat route. Harness loop files are a foundation; tool calls are not yet connected to the chat model's native tool-call protocol.
- Robust labelled RAG/answer quality benchmark; current evaluation is a retrieval smoke test.
- Automated integration test suite and a successful production build in this environment.

Do not deploy as production-complete until these gaps are addressed and the local validation steps pass.
