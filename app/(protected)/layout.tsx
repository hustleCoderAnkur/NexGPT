
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/services/auth/require-user";

export const instant = false;

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await requireUser();

    if (!user) {
        redirect("/login");
    }

    return children;
}
