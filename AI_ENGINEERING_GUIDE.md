# NexGPT AI Engineering Implementation

This bundle adds a first integrated RAG foundation, document UI/API, context budgeting, bounded-loop primitives, a safe arithmetic tool, retrieval evaluation, and AI trace persistence to the existing Next.js app.

## Setup after extracting

1. Copy `.env.example` to `.env` and restore your own environment values. Never share or commit real secrets.
2. Install dependencies with `npm install` (or your project's normal lockfile workflow).
3. Apply the Prisma schema changes to your configured database:
   - `npm run db:generate`
   - `npm run db:migrate`
4. Optional semantic embeddings: set `GOOGLE_GENERATIVE_AI_API_KEY` on the server. Without it, retrieval falls back to lexical matching. This is separate from the per-request chat API keys.
5. Run `npm run typecheck`, `npm run lint`, and `npm run dev`.

## Current capabilities

- User-scoped document upload, listing, status, preview-by-ID, and deletion APIs.
- Text ingestion for TXT, Markdown, CSV, JSON, and XML (2 MB limit). PDF/DOCX extraction and cloud file storage are not included in this iteration.
- Text chunking with overlap and estimated token counts.
- Optional Google `gemini-embedding-001` embeddings stored in JSON; lexical retrieval remains available without embedding credentials.
- RAG retrieval automatically considers the signed-in user's indexed documents for chat questions, adds relevant excerpts as untrusted context, and emits source citation events.
- Context history selection and approximate token budgeting.
- Bounded loop state/budget utilities and a safe arithmetic calculator implementation. These are primitives for controlled agent execution; the existing chat route does not yet autonomously dispatch model tool calls.
- Retrieval smoke evaluation UI/API and best-effort AI trace persistence.

## Important production gaps to address before broad deployment

- Move document parsing/embedding to a background job queue for larger workloads and retries.
- For larger corpora, move vector storage/search from JSON plus in-process cosine scoring to PostgreSQL `pgvector` with a proper index; add hybrid retrieval/reranking after a labelled evaluation set exists.
- Add PDF/DOCX parsing, malware scanning, object storage, quotas, retention and deletion verification.
- Add labelled relevance judgments and answer-grounding evaluation. The current hit rate only measures whether any candidate scored above zero; it is not a quality metric.
- Wire tool calls into an explicitly bounded model/tool execution loop, expose tool activity in the UI, and require confirmation for side-effecting tools.
- Add integration tests against a disposable database and provider mocks. This environment did not run a full dependency install, migration, or Next.js production build, so run the validation commands above locally before deploying.

## Data safety

Documents and chunks are scoped by `userId` at retrieval and API access. The uploaded source file itself is not retained; extracted text and chunks are stored in PostgreSQL. Never commit `.env` or log provider keys.
