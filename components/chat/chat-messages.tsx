"use client";

import { isTextUIPart, type UIMessage } from "ai";
import type { ChatStatus } from "ai";

import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
    Message,
    MessageContent,
    MessageResponse,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";

/** Extracts plain text from a `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
    return message.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join("");
}

type ChatMessagesProps = {
    messages: UIMessage[];
    status: ChatStatus;
};

/**
 * Renders the conversation message list with markdown responses and a loading indicator.
 */
export function ChatMessages({ messages, status }: ChatMessagesProps) {
    const isWaiting =
        status === "submitted" && messages.at(-1)?.role === "user";

    return (
        <Conversation className="bg-[#f4f0e8] text-[#171714] dark:bg-[#171714] dark:text-[#f4f0e8]">
            <ConversationContent className="mx-auto w-full max-w-4xl gap-8 px-4 py-8 md:px-6 md:py-10">
                {messages.map((message, index) => {
                    const isUser = message.role === "user";
                    const text = getMessageText(message);

                    return (
                        <Message
                            key={message.id}
                            from={message.role}
                            className={isUser ? "group" : "group"}
                        >
                            <div className={`mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ${isUser ? "justify-end text-[#66645d] dark:text-[#aaa69b]" : "text-[#171714] dark:text-[#f4f0e8]"}`}>
                                {!isUser && (
                                    <span className="inline-flex size-6 items-center justify-center border-2 border-[#171714] bg-[#d5ff45] text-[#171714] dark:border-[#f4f0e8]">
                                        N
                                    </span>
                                )}
                                <span>{isUser ? "You" : "NexGPT"}</span>
                                {isUser && (
                                    <span className="inline-flex size-6 items-center justify-center border-2 border-[#171714] bg-[#f4f0e8] text-[#171714] dark:border-[#f4f0e8] dark:bg-[#252520] dark:text-[#f4f0e8]">
                                        U
                                    </span>
                                )}
                                {index === messages.length - 1 && status === "streaming" && !isUser && (
                                    <span className="ml-1 size-2 animate-pulse rounded-full bg-[#a3d900]" aria-label="Response streaming" />
                                )}
                            </div>
                            <MessageContent className={isUser
                                ? "ml-auto max-w-[90%] border-2 border-[#171714] bg-[#d5ff45] px-5 py-4 text-[#171714] shadow-[4px_4px_0_#171714] dark:border-[#f4f0e8] dark:shadow-[4px_4px_0_#f4f0e8] md:max-w-[80%]"
                                : "max-w-full border-2 border-[#171714] bg-[#fffdf7] px-5 py-5 text-[#171714] shadow-[4px_4px_0_#171714] dark:border-[#f4f0e8] dark:bg-[#22221d] dark:text-[#f4f0e8] dark:shadow-[4px_4px_0_#f4f0e8] md:px-7 md:py-6"}>
                                {text ? (
                                    <MessageResponse>{text}</MessageResponse>
                                ) : (
                                    <span className="text-sm italic text-[#66645d] dark:text-[#aaa69b]">No text content</span>
                                )}
                            </MessageContent>
                        </Message>
                    );
                })}

                {isWaiting ? (
                    <Message from="assistant">
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                            <span className="inline-flex size-6 items-center justify-center border-2 border-[#171714] bg-[#d5ff45] text-[#171714] dark:border-[#f4f0e8]">N</span>
                            <span>NexGPT</span>
                        </div>
                        <MessageContent className="border-2 border-[#171714] bg-[#fffdf7] px-5 py-4 text-[#171714] shadow-[4px_4px_0_#171714] dark:border-[#f4f0e8] dark:bg-[#22221d] dark:text-[#f4f0e8] dark:shadow-[4px_4px_0_#f4f0e8]">
                            <Loader />
                        </MessageContent>
                    </Message>
                ) : null}
            </ConversationContent>
            <ConversationScrollButton className="border-2 border-[#171714] bg-[#d5ff45] text-[#171714] shadow-[3px_3px_0_#171714] hover:translate-y-0.5 hover:shadow-none dark:border-[#f4f0e8] dark:shadow-[3px_3px_0_#f4f0e8]" />
        </Conversation>
    );
}