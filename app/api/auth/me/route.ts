import "server-only";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/services/auth/require-user";

export async function GET() {
    try {
        const user = await requireUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401, headers: { "Cache-Control": "no-store" } },
            );
        }

        return NextResponse.json(
            { user },
            { status: 200, headers: { "Cache-Control": "no-store" } },
        );
    } catch {
        return NextResponse.json(
            { error: "Unable to retrieve the current user" },
            { status: 500, headers: { "Cache-Control": "no-store" } },
        );
    }
}
