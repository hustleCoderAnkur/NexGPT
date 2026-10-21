
"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/services/auth/require-user";
import { prisma } from "@/lib/db";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/services/ai/prompts/default";

export type ConversationListItem = {
    id: string;
    title: string;
    isPinned: boolean;
    isArchived: boolean;
    lastMessageAt: Date;
    createdAt: Date;
    updatedAt: Date;
};

async function getAuthenticatedUser() {
    const user = await requireUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    return user;
}

async function assertOwnsConversation(
    conversationId: string,
    userId: string,
) {
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            userId,
        },
        select: {
            id: true,
        },
    });

    if (!conversation) {
        throw new Error("Conversation not found");
    }

    return conversation;
}

export async function listConversations(): Promise<
    ConversationListItem[]
> {
    const user = await getAuthenticatedUser();

    return prisma.conversation.findMany({
        where: {
            userId: user.id,
            isArchived: false,
        },
        orderBy: [
            { isPinned: "desc" },
            { lastMessageAt: "desc" },
        ],
        select: {
            id: true,
            title: true,
            isPinned: true,
            isArchived: true,
            lastMessageAt: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}

export async function createConversation(
    title = "New Chat",
    model = "default",
) {
    const user = await getAuthenticatedUser();
    const normalizedTitle = title.trim() || "New Chat";

    if (normalizedTitle.length > 200) {
        throw new Error("Title must be 200 characters or less");
    }

    if (!model.trim() || model.length > 100) {
        throw new Error("Invalid model");
    }

    const conversation = await prisma.conversation.create({
        data: {
            userId: user.id,
            title: normalizedTitle,
            model: model.trim(),
            systemPrompt: DEFAULT_SYSTEM_PROMPT,
        },
    });

    revalidatePath("/dashboard");

    return conversation;
}

export async function updateConversation(
    conversationId: string,
    data: {
        title?: string;
        isPinned?: boolean;
        isArchived?: boolean;
    },
) {
    const user = await getAuthenticatedUser();

    if (!conversationId.trim()) {
        throw new Error("Conversation ID is required");
    }

    await assertOwnsConversation(conversationId, user.id);

    if (data.title !== undefined) {
        const title = data.title.trim();

        if (!title || title.length > 200) {
            throw new Error("Invalid conversation title");
        }
    }

    const conversation = await prisma.conversation.update({
        where: {
            id: conversationId,
            userId: user.id,
        },
        data: {
            ...(data.title !== undefined && {
                title: data.title.trim(),
            }),
            ...(data.isPinned !== undefined && {
                isPinned: data.isPinned,
            }),
            ...(data.isArchived !== undefined && {
                isArchived: data.isArchived,
            }),
        },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/c/${conversationId}`);

    return conversation;
}

export async function deleteConversation(
    conversationId: string,
) {
    const user = await getAuthenticatedUser();

    if (!conversationId.trim()) {
        throw new Error("Conversation ID is required");
    }

    // Delete only a conversation owned by the current user.
    const result = await prisma.conversation.deleteMany({
        where: {
            id: conversationId,
            userId: user.id,
        },
    });

    if (result.count === 0) {
        throw new Error("Conversation not found");
    }

    revalidatePath("/dashboard");
    revalidatePath("/");

    return { id: conversationId };
}

export async function getConversation(
    conversationId: string,
) {
    const user = await getAuthenticatedUser();

    if (!conversationId.trim()) {
        throw new Error("Conversation ID is required");
    }

    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            userId: user.id,
        },
        select: {
            id: true,
            title: true,
            model: true,
            systemPrompt: true,
            isPinned: true,
            isArchived: true,
            createdAt: true,
            updatedAt: true,
            lastMessageAt: true,
            messages: {
                orderBy: {
                    createdAt: "asc",
                },
                select: {
                    id: true,
                    role: true,
                    status: true,
                    content: true,
                    parts: true,
                    metadata: true,
                    parentId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
        },
    });

    if (!conversation) {
        throw new Error("Conversation not found");
    }

    return conversation;
}
