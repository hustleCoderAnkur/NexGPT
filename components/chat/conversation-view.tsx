"use client";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useChat } from "@ai-sdk/react";
import React, { useMemo } from "react";
import { useConversations } from "@/lib/services/conversations/hooks/use-conversation";
import { queryKeys } from "@/lib/services/conversations/utils/query-keys";
import { toast } from "sonner";
import { ChatEmpty } from "./chat-empty";
import { ChatMessages } from "./chat-messages";
import { ChatComposer } from "./chat-composer";

type ConversationViewProps = {
    conversationId: string;
    initialMessages: UIMessage[];
};

/**
 * Main chat view — header, message list (or empty state), and composer with streaming.
 */
export const ConversationView = ({ conversationId, initialMessages }: ConversationViewProps) => {

    const queryClient = useQueryClient();
    const { data: conversations } = useConversations();

    const transport = useMemo(() => new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages }) => ({
            body: {
                id, message: messages.at(-1)
            }
        })
    }), []);

    const { messages, sendMessage, status } = useChat({
        id: conversationId,
        messages: initialMessages,
        transport,
        onFinish: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    })
    const title =
        conversations?.find((item) => item.id === conversationId)?.title ?? "Chat";

    return (
        <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f4f0e8] text-[#171714] dark:bg-[#171714] dark:text-[#f4f0e8]">
            <header className="relative z-10 flex h-16 shrink-0 items-center gap-3 border-b-2 border-[#171714] bg-[#fffdf7] px-4 dark:border-[#f4f0e8] dark:bg-[#20201c] md:px-6">
                <div className="flex size-9 shrink-0 items-center justify-center border-2 border-[#171714] bg-[#d5ff45] text-[#171714] shadow-[2px_2px_0_#171714] dark:border-[#f4f0e8] dark:shadow-[2px_2px_0_#f4f0e8]">
                    <SidebarTrigger className="size-8 rounded-none hover:bg-black/5 dark:hover:bg-white/10" />
                </div>
                <Separator orientation="vertical" className="mx-1 h-7 w-0.5 bg-[#171714]/25 dark:bg-[#f4f0e8]/25" />
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#77756c] dark:text-[#b9b6aa]">NEXGPT / WORKSPACE</p>
                    <h1 className="truncate text-sm font-black uppercase tracking-wide md:text-base">{title}</h1>
                </div>
                <span className="hidden items-center gap-2 border-2 border-[#171714] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider sm:flex dark:border-[#f4f0e8]">
                    <span className="size-2 bg-[#a3d900]" />
                    Chat session
                </span>
            </header>

            {messages.length === 0 ? (
                <ChatEmpty />
            ) : (
                <ChatMessages messages={messages} status={status} />
            )}

            <div className="shrink-0 border-t-2 border-[#171714]/15 bg-[#f4f0e8] pt-3 dark:border-[#f4f0e8]/15 dark:bg-[#171714]">
                <ChatComposer
                    onSend={(text) => {
                        void sendMessage({ text });
                    }}
                    isSending={status !== "ready"}
                    autoFocus
                    className="pb-3"
                />
            </div>
        </div>
    );
}