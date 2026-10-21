
import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/services/auth/password";
import { signAccessToken } from "@/lib/services/auth/jwt";
import {
    createRefreshToken,
    hashToken,
    SESSION_DURATION_SECONDS,
} from "@/lib/services/auth/session";
import { loginSchema } from "@/lib/services/validations/auth";

export async function POST(request: Request) {
    try {
        // 1. Limit request body size
        const contentLength = Number(
            request.headers.get("content-length") ?? 0,
        );

        if (contentLength > 10_000) {
            return NextResponse.json(
                { error: "Request body too large" },
                { status: 413 },
            );
        }

        // 2. Parse request safely
        let body: unknown;

        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body" },
                { status: 400 },
            );
        }

        // 3. Validate credentials format
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid email or password",
                    details: parsed.error.flatten().fieldErrors,
                },
                { status: 400 },
            );
        }

        const { email, password } = parsed.data;

        // 4. Find user
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                passwordHash: true,
                createdAt: true,
            },
        });

        // Same error for unknown email and wrong password
        if (!user?.passwordHash) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 },
            );
        }

        // 5. Verify password with Argon2
        const passwordIsValid = await verifyPassword(
            user.passwordHash,
            password,
        );

        if (!passwordIsValid) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 },
            );
        }

        // 6. Create a new session
        const refreshToken = createRefreshToken();
        const sessionId = randomUUID();

        const expiresAt = new Date(
            Date.now() + SESSION_DURATION_SECONDS * 1000,
        );

        const result = await prisma.$transaction(async (tx) => {
            const session = await tx.session.create({
                data: {
                    id: sessionId,
                    userId: user.id,
                    tokenHash: hashToken(refreshToken),
                    expiresAt,
                },
                select: { id: true },
            });

            const accessToken = await signAccessToken(
                user.id,
                session.id,
            );

            return { accessToken };
        });

        // 7. Return the user profile; tokens are only set in HttpOnly cookies
        const response = NextResponse.json(
            {
                message: "Login successful",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                },
            },
            {
                status: 200,
                headers: { "Cache-Control": "no-store" },
            },
        );

        // 8. Set the refresh token in an HttpOnly cookie
        response.cookies.set("refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_DURATION_SECONDS,
        });

        response.cookies.set("access_token", result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 15 * 60,
        });

        return response;
    } catch {
        console.error("Login request failed");

        return NextResponse.json(
            { error: "Unable to complete login" },
            { status: 500 },
        );
    }
}
