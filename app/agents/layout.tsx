import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/services/auth/require-user";
import { ChatShell } from "@/components/chat/chat-shell";

export const instant = false;

export default async function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    const user = await requireUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <ChatShell
            user={{
                id: user.id,
                name: user.name,
                email: user.email,
            }}
        >
            {children}
        </ChatShell>
    );
}