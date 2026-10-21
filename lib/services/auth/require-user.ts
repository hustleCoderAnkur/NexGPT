import "server-only";

import { cookies } from "next/headers";

import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/services/auth/jwt";

export async function requireUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
        return null;
    }

    let userId: string;
    let sessionId: string;

    try {
        ({ userId, sessionId } = await verifyAccessToken(token));
    } catch {
        return null;
    }

    const session = await prisma.session.findFirst({
        where: {
            id: sessionId,
            userId,
            expiresAt: {
                gt: new Date(),
            },
        },
        select: {
            id: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    return session?.user ?? null;
}
