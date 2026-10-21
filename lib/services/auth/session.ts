
import "server-only";
import { createHash, randomBytes } from "node:crypto";

export function createRefreshToken() {
    return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
    return createHash("sha256")
        .update(token)
        .digest("hex");
}

export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;
