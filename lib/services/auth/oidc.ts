
import "server-only";
import * as oidc from "openid-client";

function getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

const clientId: string = getRequiredEnv("GOOGLE_CLIENT_ID");
const clientSecret: string = getRequiredEnv("GOOGLE_CLIENT_SECRET");

export const googleRedirectUri = new URL(
    "/api/auth/google/callback",
    process.env.APP_URL ?? "http://localhost:3000"
).toString();

let configPromise: Promise<oidc.Configuration> | undefined;

export function getGoogleConfig(): Promise<oidc.Configuration> {
    return (configPromise ??= oidc.discovery(
        new URL("https://accounts.google.com"),
        clientId,
        clientSecret,
    ));
}
