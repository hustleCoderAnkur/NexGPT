"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/services/auth/require-user";
import { prisma } from "@/lib/db";
import type { MessageRole } from "@/app/generated/prisma/client";

async function getAuthenticatedUser() {
    const user = await requireUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    return user;
}

/** Shape of a message record returned from the database. */
export type MessageItem = {
    id: string;
    conversationId: string;
    role: MessageRole;
    status: "PENDING" | "COMPLETE" | "ERROR";
    content: string | null;
    createdAt: Date;
    updatedAt: Date;
};

/**
 * Verifies that a conversation exists and belongs to the given user.
 *
 * @throws {Error} When the conversation is not found.
 */
async function assertOwnsConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
    });

    if (!conversation) {
        throw new Error("Conversation not found");
    }

    return conversation;
}

export async function listMessages(
    conversationId: string
): Promise<MessageItem[]> {
    const user = await getAuthenticatedUser();

    await assertOwnsConversation(conversationId, user.id);

    return prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            conversationId: true,
            role: true,
            status: true,
            content: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}
/**
 * Create a user message in a conversation.
 * No AI reply yet — this only persists the user's text.
 * Optionally renames "New Chat" using the first message.
 */
export async function createMessage(conversationId: string, content: string) {
    const user = await getAuthenticatedUser();
    const conversation = await assertOwnsConversation(conversationId, user.id);

    const trimmed = content.trim();
    if (!trimmed) {
        throw new Error("Message cannot be empty");
    }

    const message = await prisma.message.create({
        data: {
            conversationId,
            role: "USER",
            status: "COMPLETE",
            content: trimmed,
        },
    });

    const shouldRename =
        conversation.title === "New Chat" || conversation.title.trim() === "";

    await prisma.conversation.update({
        where: { id: conversationId },
        data: {
            lastMessageAt: new Date(),
            ...(shouldRename
                ? {
                    title:
                        trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed,
                }
                : {}),
        },
    });

    revalidatePath("/agents");
    revalidatePath(`/agents/c/${conversationId}`);
    return message;
}

/** Update message text (e.g. edit). */
export async function updateMessage(messageId: string, content: string) {
    const user = await getAuthenticatedUser();
    const trimmed = content.trim();

    if (!trimmed) {
        throw new Error("Message cannot be empty");
    }

    const existing = await prisma.message.findUnique({
        where: { id: messageId },
        include: { conversation: true },
    });

    if (!existing || existing.conversation.userId !== user.id) {
        throw new Error("Message not found");
    }

    const message = await prisma.message.update({
        where: { id: messageId },
        data: { content: trimmed },
    });

    revalidatePath(`/agents/c/${existing.conversationId}`);
    return message;
}

/** Delete a single message. */
export async function deleteMessage(messageId: string) {
    const user = await getAuthenticatedUser();

    const existing = await prisma.message.findUnique({
        where: { id: messageId },
        include: { conversation: true },
    });

    if (!existing || existing.conversation.userId !== user.id) {
        throw new Error("Message not found");
    }

    await prisma.message.delete({ where: { id: messageId } });

    revalidatePath(`/agents/c/${existing.conversationId}`);
    return { id: messageId, conversationId: existing.conversationId };
}
