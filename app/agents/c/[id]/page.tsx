import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getConversation } from "@/lib/services/conversations/actions/conversation-actions";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

type PageProps = {
    params: Promise<{ id: string }>;
};

function ConversationLoading() {
    return (
        <div className="flex h-full min-h-[50vh] items-center justify-center">
            <p className="text-sm text-muted-foreground">
                Loading conversation...
            </p>
        </div>
    );
}

export default function ConversationPage({ params }: PageProps) {
    return (
        <Suspense fallback={<ConversationLoading />}>
            <ConversationContent params={params} />
        </Suspense>
    );
}

async function ConversationContent({ params }: PageProps) {
    const { id } = await params;

    const conversation = await getConversation(id);

    const initialMessages = conversation.messages
        .filter(
            (message) =>
                message.role === "USER" ||
                message.role === "ASSISTANT",
        )
        .map((message) => {
            const metadata =
                message.metadata &&
                    typeof message.metadata === "object" &&
                    !Array.isArray(message.metadata)
                    ? (message.metadata as {
                        provider?: string;
                        modelId?: string;
                    })
                    : undefined;

            return {
                id: message.id,
                role:
                    message.role === "ASSISTANT"
                        ? ("assistant" as const)
                        : ("user" as const),
                content: message.content ?? "",
                provider: metadata?.provider,
                modelId: metadata?.modelId,
            };
        });

    return (
        <ChatWorkspace
            key={conversation.id}
            conversationId={conversation.id}
            initialMessages={initialMessages}
        />
    );
}