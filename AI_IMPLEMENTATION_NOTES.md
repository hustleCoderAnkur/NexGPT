# NexGPT AI integration notes

## What is wired up

- The home screen and `/c/[id]` conversation route use the same chat workspace.
- The workspace can select OpenAI, Google Gemini, and Anthropic Claude, and accepts the selected provider API keys in page memory.
- The keys are sent in the HTTPS request body to `/api/ai/chat`; this implementation does not write keys to Prisma, localStorage, or cookies.
- `/api/ai/chat` authenticates the user, validates selected models and keys, checks conversation ownership, loads persisted history, streams provider responses as SSE events, and persists completed assistant responses with provider/model metadata.
- New conversations receive the default system prompt. The database schema already has `Conversation.systemPrompt` and `Message.metadata`, so no schema migration was added.
- The current message and UI components are reused instead of replacing the component library.

## Supported model IDs currently configured

- OpenAI: `gpt-4o-mini`
- Google Gemini: `gemini-3.8-flash`
- Anthropic Claude: `claude-sonnet-4-5`

Availability depends on each provider account and API key. Change the model registry in `app/api/ai/chat/route.ts` and the display registry in `components/chat/chat-workspace.tsx` together when adding models.

## Run locally

1. Create a local `.env` from `.env.example` and set `DATABASE_URL`, `JWT_SECRET`, and OAuth variables as applicable.
2. Install dependencies with `npm ci`.
3. Generate Prisma Client using the project's Prisma 7 setup and ensure the database schema is migrated/deployed.
4. Run `npm run dev`.
5. Sign in, select provider(s), open **API keys**, paste the matching key(s), and send a prompt.

## Verification limitation

This archive was edited in an isolated workspace, but package installation timed out in the execution environment, so a full `tsc` and production build could not be completed here. Run `npx tsc --noEmit` and `npm run build` locally before deployment. Provider requests also require valid user-supplied API keys and working network access.
