import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ChatShell } from "@/components/chat/chat-shell";
import { requireUser } from "@/lib/services/auth/require-user";
import { DocumentManager } from "@/components/documents/document-manager";

function DocumentsLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Loading your documents...
      </p>
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
      <DocumentManager />
    </Suspense>
  );
}