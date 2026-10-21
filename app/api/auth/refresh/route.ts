import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { signAccessToken } from "@/lib/services/auth/jwt";
import {
    createRefreshToken,
    hashToken,
    SESSION_DURATION_SECONDS,
} from "@/lib/services/auth/session";

const ACCESS_TOKEN_DURATION_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
    const refreshToken = request.cookies.get("refresh_token")?.value;

    if (!refreshToken) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: { "Cache-Control": "no-store" } },
        );
    }

    try {
        const oldTokenHash = hashToken(refreshToken);
        const session = await prisma.session.findFirst({
            where: {
                tokenHash: oldTokenHash,
                expiresAt: { gt: new Date() },
            },
            select: { id: true, userId: true },
        });

        if (!session) {
            const response = NextResponse.json(
                { error: "Session expired. Please sign in again." },
                { status: 401, headers: { "Cache-Control": "no-store" } },
            );
            response.cookies.set("access_token", "", { path: "/", maxAge: 0 });
            response.cookies.set("refresh_token", "", { path: "/", maxAge: 0 });
            return response;
        }

        const nextRefreshToken = createRefreshToken();
        const nextExpiresAt = new Date(
            Date.now() + SESSION_DURATION_SECONDS * 1000,
        );
        const accessToken = await signAccessToken(session.userId, session.id);

        // Conditional update prevents reusing a refresh token after rotation.
        const rotated = await prisma.session.updateMany({
            where: {
                id: session.id,
                tokenHash: oldTokenHash,
                expiresAt: { gt: new Date() },
            },
            data: {
                tokenHash: hashToken(nextRefreshToken),
                expiresAt: nextExpiresAt,
            },
        });

        if (rotated.count !== 1) {
            return NextResponse.json(
                { error: "Session expired. Please sign in again." },
                { status: 401, headers: { "Cache-Control": "no-store" } },
            );
        }

        const response = NextResponse.json(
            { message: "Session refreshed" },
            { status: 200, headers: { "Cache-Control": "no-store" } },
        );
        const secure = process.env.NODE_ENV === "production";
        response.cookies.set("access_token", accessToken, {
            httpOnly: true,
            secure,
            sameSite: "lax",
            path: "/",
            maxAge: ACCESS_TOKEN_DURATION_SECONDS,
        });
        response.cookies.set("refresh_token", nextRefreshToken, {
            httpOnly: true,
            secure,
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_DURATION_SECONDS,
        });

        return response;
    } catch {
        return NextResponse.json(
            { error: "Unable to refresh session" },
            { status: 500, headers: { "Cache-Control": "no-store" } },
        );
    }
}
