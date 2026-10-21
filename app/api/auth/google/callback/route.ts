
import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import * as oidc from "openid-client";

import { prisma } from "@/lib/db";
import { getGoogleConfig } from "@/lib/services/auth/oidc";
import { signAccessToken } from "@/lib/services/auth/jwt";
import {
    createRefreshToken,
    hashToken,
    SESSION_DURATION_SECONDS,
} from "@/lib/services/auth/session";

const COOKIE_PATH = "/api/auth/google";
const ACCESS_TOKEN_DURATION_SECONDS = 15 * 60;

function clearFlowCookies(response: NextResponse) {
    const secure = process.env.NODE_ENV === "production";

    for (const name of [
        "google_state",
        "google_nonce",
        "google_verifier",
        "google_intent",
    ]) {
        response.cookies.set(name, "", {
            httpOnly: true,
            secure,
            sameSite: "lax",
            path: COOKIE_PATH,
            maxAge: 0,
        });
    }
}

function fail(
    request: Request,
    intent: "login" | "register",
    error: string,
) {
    const target = new URL(
        intent === "register" ? "/register" : "/login",
        request.url,
    );

    target.searchParams.set("error", error);

    const response = NextResponse.redirect(target);
    response.headers.set("Cache-Control", "no-store");

    clearFlowCookies(response);

    return response;
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const cookieStore = await cookies();

    const expectedState = cookieStore.get("google_state")?.value;
    const expectedNonce = cookieStore.get("google_nonce")?.value;
    const codeVerifier = cookieStore.get("google_verifier")?.value;
    const rawIntent = cookieStore.get("google_intent")?.value;

    if (rawIntent !== "login" && rawIntent !== "register") {
        return fail(request, "login", "invalid_google_flow");
    }

    const intent = rawIntent;

    if (
        !expectedState ||
        !expectedNonce ||
        !codeVerifier ||
        url.searchParams.has("error")
    ) {
        return fail(request, intent, "google_signin_failed");
    }

    try {
        const config = await getGoogleConfig();

        const tokens = await oidc.authorizationCodeGrant(
            config,
            url,
            {
                expectedState,
                expectedNonce,
                pkceCodeVerifier: codeVerifier,
                idTokenExpected: true,
            },
        );

        const claims = tokens.claims();

        if (
            !claims ||
            typeof claims.sub !== "string" ||
            !claims.sub ||
            typeof claims.email !== "string" ||
            claims.email_verified !== true
        ) {
            return fail(
                request,
                intent,
                "google_email_not_verified",
            );
        }

        const provider = "google";
        const providerAccountId = claims.sub;
        const email = claims.email.trim().toLowerCase();

        const name =
            typeof claims.name === "string"
                ? claims.name
                : null;

        const existingAccount = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider,
                    providerAccountId,
                },
            },
            select: {
                userId: true,
            },
        });

        let userId: string;

        if (existingAccount) {
            if (intent === "register") {
                return fail(
                    request,
                    intent,
                    "google_account_exists",
                );
            }

            userId = existingAccount.userId;
        } else {
            const emailUser = await prisma.user.findUnique({
                where: { email },
                select: { id: true },
            });

            if (emailUser) {
                return fail(
                    request,
                    intent,
                    "account_link_required",
                );
            }

            if (intent === "login") {
                return fail(
                    request,
                    intent,
                    "google_account_not_registered",
                );
            }

            const newUser = await prisma.$transaction(
                async (tx) => {
                    const createdUser = await tx.user.create({
                        data: {
                            email,
                            name,
                            emailVerified: new Date(),
                        },
                        select: {
                            id: true,
                        },
                    });

                    await tx.account.create({
                        data: {
                            userId: createdUser.id,
                            provider,
                            providerAccountId,
                        },
                    });

                    return createdUser;
                },
            );

            userId = newUser.id;
        }

        const refreshToken = createRefreshToken();
        const sessionId = randomUUID();

        const expiresAt = new Date(
            Date.now() + SESSION_DURATION_SECONDS * 1000,
        );

        const accessToken = await prisma.$transaction(
            async (tx) => {
                const session = await tx.session.create({
                    data: {
                        id: sessionId,
                        userId,
                        tokenHash: hashToken(refreshToken),
                        expiresAt,
                    },
                    select: {
                        id: true,
                    },
                });

                return signAccessToken(userId, session.id);
            },
        );

        // Redirect directly to the dashboard; no /complete page.
        const response = NextResponse.redirect(
            new URL("/", request.url),
        );

        response.headers.set("Cache-Control", "no-store");
        response.headers.set("Referrer-Policy", "no-referrer");

        const secure = process.env.NODE_ENV === "production";

        response.cookies.set("refresh_token", refreshToken, {
            httpOnly: true,
            secure,
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_DURATION_SECONDS,
        });

        response.cookies.set("access_token", accessToken, {
            httpOnly: true,
            secure,
            sameSite: "lax",
            path: "/",
            maxAge: ACCESS_TOKEN_DURATION_SECONDS,
        });

        clearFlowCookies(response);

        return response;
    } catch (error) {
        console.error(
            "Google OIDC callback failed:",
            error instanceof Error
                ? error.message
                : "Unknown error",
        );

        return fail(
            request,
            intent,
            "google_signin_failed",
        );
    }
}
