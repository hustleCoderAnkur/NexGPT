
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ChatShell } from "@/components/chat/chat-shell";
import { requireUser } from "@/lib/services/auth/require-user";
import { DocumentManager } from "@/components/documents/document-manager";

function DocumentsLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-[#f4f0e8] px-6 dark:bg-[#171714]">
      <div className="flex items-center gap-3 border-2 border-black bg-[#fffdf7] px-5 py-4 shadow-[4px_4px_0_#171714] dark:border-[#d5ff45] dark:bg-[#22221e] dark:shadow-[4px_4px_0_#d5ff45]">
        <span
          aria-hidden="true"
          className="size-3 animate-pulse bg-[#d5ff45] ring-1 ring-black"
        />
        <p className="text-sm font-bold uppercase tracking-wide text-[#171714] dark:text-[#fffdf7]">
          Loading your documents...
        </p>
      </div>
    </div>
  );
}

async function DocumentsContent() {
  const user = await requireUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <ChatShell
      user={{
        id: user.id,
        name: user.name ?? null,
        email: user.email,
      }}
    >
      <DocumentManager />
    </ChatShell>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<DocumentsLoading />}>
      <DocumentsContent />
    </Suspense>
  );
}
