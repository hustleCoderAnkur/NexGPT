
import {
    convertToModelMessages,
    createIdGenerator,
    streamText,
    type UIMessage,
} from "ai";

import {
    getChatModel,
    type AIProvider,
} from "@/lib/services/ai/utils/model";

import {
    loadChatMessages,
    saveChatMessages,
} from "@/lib/services/ai/actions/chat-store";

import { requireUser } from "@/lib/services/auth/require-user";
import { prisma } from "@/lib/db";
import { buildContext } from "@/lib/ai/context/build-context";
import { retrieveContext } from "@/lib/ai/rag/retrieval/retrieval-service";

type ModelSelection = {
    provider: AIProvider;
    modelId: string;
};

type ChatRequest = {
    id: string;
    message: UIMessage;
    selections: ModelSelection[];
    keys: Partial<Record<AIProvider, string>>;
};

const LOG_PREFIX = "[NexGPT Chat API]";

const allowedModels: Record<AIProvider, readonly string[]> = {
    openai: ["gpt-4o-mini"],
    google: ["gemini-3.8-flash"],
    anthropic: ["claude-sonnet-4-5"],
};

const MAX_BODY_BYTES = 64_000;
const MAX_MESSAGE_BYTES = 48_000;
const MAX_OUTPUT_TOKENS = 2048;

const generateMessageId = createIdGenerator({
    prefix: "msg",
    size: 16,
});

function logInfo(
    message: string,
    details?: Record<string, unknown>,
) {
    console.info(LOG_PREFIX, message, details ?? "");
}

function logError(
    message: string,
    error: unknown,
    details?: Record<string, unknown>,
) {
    console.error(LOG_PREFIX, message, {
        ...details,
        error:
            error instanceof Error
                ? { name: error.name, message: error.message }
                : "Unknown error",
    });
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function isProvider(value: unknown): value is AIProvider {
    return (
        value === "openai" ||
        value === "google" ||
        value === "anthropic"
    );
}

function isValidSelection(
    value: unknown,
): value is ModelSelection {
    if (!isRecord(value)) return false;

    const provider = value.provider;
    const modelId = value.modelId;

    return (
        isProvider(provider) &&
        typeof modelId === "string" &&
        allowedModels[provider].includes(modelId)
    );
}

function isValidMessage(value: unknown): value is UIMessage {
    if (!isRecord(value)) return false;

    return (
        typeof value.id === "string" &&
        value.id.length > 0 &&
        value.id.length <= 200 &&
        value.role === "user" &&
        Array.isArray(value.parts)
    );
}

function isValidRequest(value: unknown): value is ChatRequest {
    if (!isRecord(value)) return false;

    const { id, message, selections, keys } = value;

    if (
        typeof id !== "string" ||
        id.length === 0 ||
        id.length > 200 ||
        !isValidMessage(message) ||
        !Array.isArray(selections) ||
        selections.length < 1 ||
        selections.length > 3 ||
        !selections.every(isValidSelection) ||
        !isRecord(keys)
    ) {
        return false;
    }

    const providers = selections.map(
        (selection) => selection.provider,
    );

    if (new Set(providers).size !== providers.length) {
        return false;
    }

    for (const selection of selections) {
        const key = keys[selection.provider];

        if (
            typeof key !== "string" ||
            key.trim().length === 0 ||
            key.length > 500
        ) {
            return false;
        }
    }

    // Reject unexpected provider keys or invalid key values.
    for (const [provider, key] of Object.entries(keys)) {
        if (
            !isProvider(provider) ||
            typeof key !== "string" ||
            key.length > 500
        ) {
            return false;
        }
    }

    return true;
}

function sendEvent(
    controller: ReadableStreamDefaultController<Uint8Array>,
    event: Record<string, unknown>,
) {
    controller.enqueue(
        new TextEncoder().encode(
            `data: ${JSON.stringify(event)}\n\n`,
        ),
    );
}

export async function POST(req: Request) {
    try {
        // 1. Authenticate.
        const user = await requireUser();

        if (!user) {
            return Response.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // 2. Read and limit the request body.
        const declaredLength = req.headers.get("content-length");

        if (
            declaredLength !== null &&
            (!/^\d+$/.test(declaredLength) ||
                Number(declaredLength) > MAX_BODY_BYTES)
        ) {
            return Response.json(
                { error: "Request body is too large" },
                { status: 413 },
            );
        }

        const rawBody = await req.text();

        if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
            return Response.json(
                { error: "Request body is too large" },
                { status: 413 },
            );
        }

        let body: unknown;

        try {
            body = JSON.parse(rawBody);
        } catch {
            return Response.json(
                { error: "Invalid JSON body" },
                { status: 400 },
            );
        }

        if (!isValidRequest(body)) {
            logInfo("Request validation failed");

            return Response.json(
                { error: "Invalid chat request" },
                { status: 400 },
            );
        }

        const { id, message, selections, keys } = body;

        if (
            new TextEncoder().encode(
                JSON.stringify(message),
            ).byteLength > MAX_MESSAGE_BYTES
        ) {
            return Response.json(
                { error: "Message is too large" },
                { status: 413 },
            );
        }

        logInfo("Request validated", {
            conversationId: id,
            selectionCount: selections.length,
            providers: selections.map(({ provider, modelId }) => ({
                provider,
                modelId,
            })),
        });

        // 3. Verify conversation ownership.
        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!conversation) {
            return Response.json(
                { error: "Conversation not found" },
                { status: 404 },
            );
        }

        // 4. Load history and persist the incoming user message.
        const previousMessages = await loadChatMessages(id);

        const alreadySaved = previousMessages.some(
            (storedMessage) => storedMessage.id === message.id,
        );

        const messages: UIMessage[] = alreadySaved
            ? previousMessages
            : [...previousMessages, message];

        if (!alreadySaved) {
            await saveChatMessages(id, [message]);
        }

        const latestText = message.parts
            .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
            .join("\n")
            .trim();

        let retrieved: Awaited<ReturnType<typeof retrieveContext>> = {
            chunks: [], context: "", citations: [],
        };
        try {
            if (latestText) retrieved = await retrieveContext(user.id, latestText, 5);
        } catch (error) {
            logError("RAG retrieval failed; continuing without retrieved context", error);
        }

        const baseSystemPrompt = conversation.systemPrompt ?? "You are NexGPT, a helpful assistant.";
        const builtContext = buildContext({
            systemPrompt: baseSystemPrompt,
            messages,
            retrievedContext: retrieved.context || undefined,
        });
        const modelMessages = await convertToModelMessages(builtContext.messages);
        const systemPrompt = builtContext.system;

        // 5. Stream each provider independently.
        const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
                try {
                    await Promise.all(
                        selections.map(async ({ provider, modelId }) => {
                            sendEvent(controller, {
                                type: "start",
                                provider,
                                modelId,
                            });

                            try {
                                const apiKey = keys[provider];

                                // Runtime validation has already checked this.
                                if (!apiKey) {
                                    throw new Error("Missing provider API key");
                                }

                                const model = getChatModel({
                                    provider,
                                    modelId,
                                    apiKey,
                                });

                                if (retrieved.citations.length > 0) {
                                    sendEvent(controller, {
                                        type: "sources",
                                        provider,
                                        citations: retrieved.citations,
                                    });
                                }

                                const result = streamText({
                                    model,
                                    system: systemPrompt,
                                    messages: modelMessages,
                                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                                    maxRetries: 0,
                                });

                                let answer = "";
                                let chunkCount = 0;

                                for await (const chunk of result.textStream) {
                                    answer += chunk;
                                    chunkCount++;

                                    sendEvent(controller, {
                                        type: "delta",
                                        provider,
                                        text: chunk,
                                    });
                                }

                                // Do not treat an empty response as success.
                                if (
                                    chunkCount === 0 ||
                                    answer.trim().length === 0
                                ) {
                                    throw new Error(
                                        "Provider returned an empty response",
                                    );
                                }

                                const assistantMessage: UIMessage = {
                                    id: generateMessageId(),
                                    role: "assistant",
                                    parts: [
                                        {
                                            type: "text",
                                            text: answer,
                                        },
                                    ],
                                };

                                let saved = true;

                                try {
                                    await saveChatMessages(
                                        id,
                                        [assistantMessage],
                                        {
                                            updateTitle: false,
                                            metadata: { provider, modelId },
                                        },
                                    );
                                } catch (error) {
                                    saved = false;

                                    logError(
                                        "Assistant response persistence failed",
                                        error,
                                        { provider, modelId },
                                    );

                                    sendEvent(controller, {
                                        type: "warning",
                                        provider,
                                        message:
                                            "Response generated, but saving it to history failed.",
                                    });
                                }

                                logInfo("Provider generation completed", {
                                    provider,
                                    modelId,
                                    chunkCount,
                                    characterCount: answer.length,
                                    saved,
                                });

                                sendEvent(controller, {
                                    type: "done",
                                    provider,
                                    modelId,
                                    messageId: assistantMessage.id,
                                    saved,
                                });
                            } catch (error) {
                                logError(
                                    "Provider generation failed",
                                    error,
                                    { provider, modelId },
                                );

                                sendEvent(controller, {
                                    type: "error",
                                    provider,
                                    modelId,
                                    message:
                                        "Provider failed. Check the model ID, API key, model access, quota, and connection.",
                                });
                            }
                        }),
                    );
                } catch (error) {
                    logError("Comparison execution failed", error);

                    try {
                        sendEvent(controller, {
                            type: "error",
                            message: "Comparison failed.",
                        });
                    } catch {
                        // The client may have disconnected.
                    }
                } finally {
                    try {
                        sendEvent(controller, { type: "complete" });
                    } catch {
                        // The client may have disconnected.
                    }

                    try {
                        controller.close();
                    } catch {
                        // The stream may already be closed or cancelled.
                    }
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
                "X-Accel-Buffering": "no",
            },
        });
    } catch (error) {
        logError("Chat request failed before streaming", error);

        return Response.json(
            { error: "Unable to process chat request" },
            { status: 500 },
        );
    }
}
