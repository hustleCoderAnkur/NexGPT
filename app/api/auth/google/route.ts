
import "server-only";

import { NextResponse } from "next/server";
import * as oidc from "openid-client";

import {
    getGoogleConfig,
    googleRedirectUri,
} from "@/lib/services/auth/oidc";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const intent = url.searchParams.get("intent");

    if (intent !== "login" && intent !== "register") {
        return NextResponse.json(
            { error: "Invalid Google sign-in intent" },
            { status: 400 }
        );
    }

    try {
        const config = await getGoogleConfig();

        const state = oidc.randomState();
        const nonce = oidc.randomNonce();
        const codeVerifier = oidc.randomPKCECodeVerifier();

        const codeChallenge =
            await oidc.calculatePKCECodeChallenge(codeVerifier);

        const authorizationUrl = oidc.buildAuthorizationUrl(config, {
            redirect_uri: googleRedirectUri,
            response_type: "code",
            scope: "openid email profile",
            state,
            nonce,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            prompt: "consent select_account"
        });


        const response = NextResponse.redirect(authorizationUrl);

        response.headers.set("Cache-Control", "no-store");
        response.headers.set("Referrer-Policy", "no-referrer");

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            path: "/api/auth/google",
            maxAge: 600,
        };

        response.cookies.set("google_state", state, cookieOptions);
        response.cookies.set("google_nonce", nonce, cookieOptions);
        response.cookies.set("google_verifier", codeVerifier, cookieOptions);
        response.cookies.set("google_intent", intent, cookieOptions);

        return response;
    } catch (error) {
        console.error(
            "Could not start Google OIDC flow:",
            error instanceof Error ? error.message : "Unknown error"
        );

        const target = new URL(
            intent === "register" ? "/signup" : "/login",
            request.url
        );

        target.searchParams.set("error", "google_unavailable");

        const response = NextResponse.redirect(target);
        response.headers.set("Cache-Control", "no-store");

        return response;
    }
}
