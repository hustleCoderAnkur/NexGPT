import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/services/auth/jwt";
import { hashToken } from "@/lib/services/auth/session";

export async function POST(request: NextRequest) {
    try {
        const refreshToken = request.cookies.get("refresh_token")?.value;
        const accessToken = request.cookies.get("access_token")?.value;

        if (refreshToken) {
            await prisma.session.deleteMany({
                where: { tokenHash: hashToken(refreshToken) },
            });
        }

        if (accessToken) {
            try {
                const { userId, sessionId } = await verifyAccessToken(
                    accessToken,
                );
                await prisma.session.deleteMany({
                    where: { id: sessionId, userId },
                });
            } catch {
                // Expired or invalid access tokens are still cleared below.
            }
        }

        const response = NextResponse.json(
            { message: "Logged out successfully" },
            { status: 200, headers: { "Cache-Control": "no-store" } },
        );
        const secure = process.env.NODE_ENV === "production";

        for (const name of ["access_token", "refresh_token"]) {
            response.cookies.set(name, "", {
                httpOnly: true,
                secure,
                sameSite: "lax",
                path: "/",
                maxAge: 0,
                expires: new Date(0),
            });
        }

        return response;
    } catch {
        return NextResponse.json(
            { error: "Unable to complete logout" },
            { status: 500, headers: { "Cache-Control": "no-store" } },
        );
    }
}
