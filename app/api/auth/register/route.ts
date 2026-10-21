
import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/services/auth/password";
import { signAccessToken } from "@/lib/services/auth/jwt";
import {
    createRefreshToken,
    hashToken,
    SESSION_DURATION_SECONDS,
} from "@/lib/services/auth/session";
import { registerSchema } from "@/lib/services/validations/auth";

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

        // 2. Parse JSON safely
        let body: unknown;

        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body" },
                { status: 400 },
            );
        }

        // 3. Validate input on the server
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid registration details",
                    details: parsed.error.flatten().fieldErrors,
                },
                { status: 400 },
            );
        }

        const { name, email, password } = parsed.data;

        // 4. Check whether the email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Unable to register with this email" },
                { status: 409 },
            );
        }

        // 5. Hash password and prepare session
        const passwordHash = await hashPassword(password);
        const refreshToken = createRefreshToken();
        const sessionId = randomUUID();

        const expiresAt = new Date(
            Date.now() + SESSION_DURATION_SECONDS * 1000,
        );

        // 6. Create user and session atomically
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    passwordHash,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    createdAt: true,
                },
            });

            const session = await tx.session.create({
                data: {
                    id: sessionId,
                    userId: user.id,
                    tokenHash: hashToken(refreshToken),
                    expiresAt,
                },
                select: {
                    id: true,
                },
            });

            const accessToken = await signAccessToken(
                user.id,
                session.id,
            );

            return {
                user,
                accessToken,
            };
        });

        // 7. Return the user profile; tokens are only set in HttpOnly cookies
        const response = NextResponse.json(
            {
                message: "Registration successful",
                user: result.user,
            },
            {
                status: 201,
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );

        // 8. Set the refresh token in an HttpOnly cookie
        const secure = process.env.NODE_ENV === "production";

        response.cookies.set("refresh_token", refreshToken, {
            httpOnly: true,
            secure,
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
    } catch (error) {
        // Handle duplicate unique fields, including concurrent requests
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return NextResponse.json(
                { error: "Unable to register with this email" },
                { status: 409 },
            );
        }

        // Do not expose internal errors to clients
        console.error("Registration failed");

        return NextResponse.json(
            { error: "Unable to complete registration" },
            { status: 500 },
        );
    }
}
