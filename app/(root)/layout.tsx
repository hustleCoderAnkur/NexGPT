
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "NexGPT — One workspace. Multiple perspectives.",
    description:
        "Explore multiple AI perspectives, organize conversations, and work with your documents in one focused workspace.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-white text-neutral-950">
            {children}
        </div>
    );
}
