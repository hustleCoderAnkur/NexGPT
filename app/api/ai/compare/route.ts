
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

import { requireUser } from "@/lib/services/auth/require-user";


const MODEL_REGISTRY = {
    openai: ["gpt-4.1-mini"],
    google: ["gemini-3.8-flash"],
    anthropic: ["claude-sonnet-4-5"],
} as const;

type Provider = keyof typeof MODEL_REGISTRY;

type Selection = {
    provider: Provider;
    model: string;
};

type RequestBody = {
    prompt: string;
    selections: Selection[];
    keys: Partial<Record<Provider, string>>;
};

function isProvider(value: unknown): value is Provider {
    return (
        typeof value === "string" &&
        Object.hasOwn(MODEL_REGISTRY, value)
    );
}

function isValidSelection(value: unknown): value is Selection {
    if (!value || typeof value !== "object") return false;

    const selection = value as Record<string, unknown>;

    return (
        isProvider(selection.provider) &&
        typeof selection.model === "string" &&
        (MODEL_REGISTRY[selection.provider] as readonly string[])
            .includes(selection.model)
    );
}

function encodeEvent(
    controller: ReadableStreamDefaultController<Uint8Array>,
    encoder: TextEncoder,
    event: Record<string, unknown>,
) {
    controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
    );
}

export async function POST(request: Request) {
    // Authenticate before processing any provider requests.
    const user = await requireUser();

    if (!user) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401 },
        );
    }

    // Basic request-size guard.
    const contentLength = Number(
        request.headers.get("content-length") ?? 0,
    );

    if (contentLength > 32_000) {
        return Response.json(
            { error: "Request body is too large" },
            { status: 413 },
        );
    }

    let body: RequestBody;

    try {
        body = await request.json();
    } catch {
        return Response.json(
            { error: "Invalid JSON body" },
            { status: 400 },
        );
    }

    if (
        !body ||
        typeof body.prompt !== "string" ||
        body.prompt.trim().length === 0 ||
        body.prompt.length > 12_000 ||
        !Array.isArray(body.selections) ||
        body.selections.length < 1 ||
        body.selections.length > 3 ||
        !body.selections.every(isValidSelection) ||
        !body.keys ||
        typeof body.keys !== "object"
    ) {
        return Response.json(
            { error: "Invalid prompt, keys, or model selections" },
            { status: 400 },
        );
    }

    const providers = body.selections.map((item) => item.provider);

    if (new Set(providers).size !== providers.length) {
        return Response.json(
            { error: "Select each provider only once" },
            { status: 400 },
        );
    }

    for (const selection of body.selections) {
        const key = body.keys[selection.provider];

        if (
            typeof key !== "string" ||
            key.trim().length === 0 ||
            key.length > 500
        ) {
            return Response.json(
                {
                    error: `Add a valid API key for ${selection.provider}`,
                },
                { status: 400 },
            );
        }
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const send = (event: Record<string, unknown>) => {
                encodeEvent(controller, encoder, event);
            };

            try {
                await Promise.all(
                    body.selections.map(async ({ provider, model }) => {
                        send({
                            type: "start",
                            provider,
                            model,
                        });

                        try {
                            const apiKey = body.keys[provider]!;

                            const languageModel =
                                provider === "openai"
                                    ? createOpenAI({ apiKey })(model)
                                    : provider === "google"
                                        ? createGoogleGenerativeAI({ apiKey })(model)
                                        : createAnthropic({ apiKey })(model);

                            const result = streamText({
                                model: languageModel,
                                prompt: body.prompt.trim(),
                                maxOutputTokens: 2048,
                                maxRetries: 0,
                            });

                            for await (const text of result.textStream) {
                                send({
                                    type: "delta",
                                    provider,
                                    text,
                                });
                            }

                            send({
                                type: "done",
                                provider,
                            });
                        } catch {
                            // Don't expose raw provider errors or API keys.
                            send({
                                type: "error",
                                provider,
                                message:
                                    "This provider failed. Check its API key, model access, quota, and network connection.",
                            });
                        }
                    }),
                );
            } catch {
                send({
                    type: "error",
                    message: "The comparison could not be completed.",
                });
            } finally {
                send({ type: "complete" });
                controller.close();
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
}
