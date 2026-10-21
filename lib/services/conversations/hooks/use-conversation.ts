"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toast"

import {
    createConversation,
    deleteConversation,
    updateConversation,
    listConversations,
} from "../actions/conversation-actions"

import { queryKeys } from "../utils/query-keys"

export function useConversations() {
    return useQuery({
        queryKey: queryKeys.conversations.all,
        queryFn: () => listConversations(),
    })
}

export function useCreateConversation() {
    const queryClient = useQueryClient()
    const router = useRouter()

    return useMutation({
        mutationFn: (title?: string) => createConversation(title),

        onSuccess: (conversation) => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            })

            toast.add({
                title: "Chat created",
                description: "Your conversation is ready.",
                type: "success",
            })

            router.push(`/c/${conversation.id}`)
        },

        onError: (error: Error) => {
            toast.add({
                title: "Could not create chat",
                description: error.message || "Please try again.",
                type: "error",
            })
        },
    })
}

export function useDeleteConversation() {
    const queryClient = useQueryClient()
    const router = useRouter()

    return useMutation({
        mutationFn: (id: string) => deleteConversation(id),

        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            })

            toast.add({
                title: "Chat deleted",
                description: "Conversation deleted successfully.",
                type: "success",
            })

            router.push("/")
        },

        onError: (error: Error) => {
            toast.add({
                title: "Could not delete chat",
                description: error.message || "Please try again.",
                type: "error",
            })
        },
    })
}

export function useUpdateConversation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            id,
            title,
            isPinned,
            isArchived,
        }: {
            id: string
            title?: string
            isPinned?: boolean
            isArchived?: boolean
        }) =>
            updateConversation(id, {
                title,
                isPinned,
                isArchived,
            }),

        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            })

            toast.add({
                title: "Chat updated",
                description: "Conversation updated successfully.",
                type: "success",
            })
        },

        onError: (error: Error) => {
            toast.add({
                title: "Could not update chat",
                description: error.message || "Please try again.",
                type: "error",
            })
        },
    })
}

