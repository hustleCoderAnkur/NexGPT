# NexGPT debugging patch

## Changes included

- Removed the duplicate `/` page route by moving the ModeToggle demo to `/mode-test`.
- Added a valid layout module for the `(root)` route group.
- Fixed the new-chat redirect to `/c/<conversationId>` and corrected the conversation revalidation path.
- Changed `requireUser()` to return `null` for missing/invalid sessions; protected pages now redirect unauthenticated users correctly, and message actions explicitly reject unauthenticated calls.
- Updated password login and registration to set an HttpOnly `access_token` cookie, matching Google sign-in. Access tokens are no longer returned to the browser or stored in localStorage.
- Sent successful login and registration flows (including Google OAuth) to `/`, the implemented new-chat entry point. `/dashboard` now redirects there instead of showing a placeholder.
- Added `/api/auth/me`, `/api/auth/logout`, and `/api/auth/refresh` handlers.
- Fixed the cached Google OIDC configuration return type.
- Removed the `node` npm package dependency. Install Node.js as a runtime separately.
- Added `.env.example`; the real `.env` file is intentionally excluded from this archive.

## Verification performed

- TypeScript/TSX syntax transpilation passed for all 45 files under `app` and `lib`.
- `package.json` and the root dependency list in `package-lock.json` match.
- The duplicate `/` page route is removed.
- A full Next.js build/typecheck could not be completed in this environment because dependency installation could not fetch packages from the npm registry. Run the verification commands below after installing dependencies locally.

## Local verification

1. Copy your existing `.env` into this project folder. Do not share it.
2. Use Node.js 20.9 or newer (Node.js 22 LTS is suitable for this Next.js version).
3. Run `npm ci`.
4. Run `npx prisma generate`.
5. Run `npx tsc --noEmit` and `npm run build`.

The chat page and dashboard content are still placeholders in the source project; this patch fixes routing/authentication blockers but does not implement AI response generation.
