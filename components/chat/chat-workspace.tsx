"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowUp,
    FileText,
    KeyRound,
    LoaderCircle,
    Plus,
    ShieldCheck,
    X,
} from "lucide-react";

import {
    Message,
    MessageContent,
    MessageResponse,
} from "@/components/ai-elements/message";
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { createConversation } from "@/lib/services/conversations/actions/conversation-actions";

type Provider = "openai" | "google" | "anthropic";

type Selection = {
    provider: Provider;
    modelId: string;
};

type EventData = {
    type: string;
    provider?: Provider;
    modelId?: string;
    text?: string;
    message?: string;
    messageId?: string;
    citations?: { index: number; documentId: string; documentName: string; chunkId: string; score: number }[];
};

type StoredMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    provider?: string;
    modelId?: string;
};

const MODEL_OPTIONS: Record<Provider, { id: string; label: string }> = {
    openai: {
        id: "gpt-4o-mini",
        label: "GPT-4o mini",
    },
    google: {
        id: "gemini-3.8-flash",
        label: "gemini-3.8-flash",
    },
    anthropic: {
        id: "claude-sonnet-4-5",
        label: "Claude Sonnet 4.5",
    },
};

const PROVIDERS: { id: Provider; label: string }[] = [
    { id: "openai", label: "OpenAI" },
    { id: "google", label: "Google Gemini" },
    { id: "anthropic", label: "Anthropic Claude" },
];

function getProviderLabel(provider: Provider) {
    return PROVIDERS.find((item) => item.id === provider)?.label ?? provider;
}

function parseEventFrame(frame: string): EventData | null {
    // Each server-sent event contains one JSON data line.
    const line = frame
        .split(/\r?\n/)
        .find((item) => item.startsWith("data: "));

    if (!line) return null;

    try {
        return JSON.parse(line.slice(6)) as EventData;
    } catch {
        console.error("NexGPT received an invalid SSE event.");
        return null;
    }
}

export function ChatWorkspace({
    conversationId,
    initialMessages = [],
}: {
    conversationId?: string;
    initialMessages?: StoredMessage[];
}) {
    const router = useRouter();

    const [id, setId] = useState(conversationId);
    const [messages, setMessages] =
        useState<StoredMessage[]>(initialMessages);
    const [draft, setDraft] = useState("");
    const [selected, setSelected] = useState<Provider[]>(["openai"]);
    const [keys, setKeys] = useState<Partial<Record<Provider, string>>>({});
    const [showKeys, setShowKeys] = useState(false);
    const [busy, setBusy] = useState(false);
    const [sources, setSources] = useState<Partial<Record<Provider, NonNullable<EventData["citations"]>>>>({});

    const [errors, setErrors] =
        useState<Partial<Record<Provider, string>>>({});
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [streaming, setStreaming] =
        useState<Partial<Record<Provider, string>>>({});

    const selections = useMemo<Selection[]>(
        () =>
            selected.map((provider) => ({
                provider,
                modelId: MODEL_OPTIONS[provider].id,
            })),
        [selected],
    );

    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleFilesSelected(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const files = Array.from(event.target.files ?? []);

        setAttachedFiles((current) => [...current, ...files]);

        // Same file ko dobara select karne ki permission
        event.target.value = "";
    }

    function removeAttachedFile(index: number) {
        setAttachedFiles((current) =>
            current.filter((_, i) => i !== index)
        );
    }

    function toggleProvider(provider: Provider) {
        if (busy) return;

        setSelected((current) => {
            if (current.includes(provider)) {
                return current.filter((item) => item !== provider);
            }

            if (current.length >= 3) return current;

            return [...current, provider];
        });

        setErrors((current) => {
            const next = { ...current };
            delete next[provider];
            return next;
        });
    }

    function updateApiKey(provider: Provider, value: string) {
        setKeys((current) => ({
            ...current,
            [provider]: value,
        }));

        setErrors((current) => {
            const next = { ...current };
            delete next[provider];
            return next;
        });
    }


    async function sendMessage(event?: FormEvent<HTMLFormElement>) {
        event?.preventDefault();

        const text = draft.trim();
        const filesToUpload = [...attachedFiles];

        if (
            (!text && filesToUpload.length === 0) ||
            busy ||
            selected.length === 0
        ) {
            return;
        }

        const missing = selected.find(
            (provider) => !keys[provider]?.trim(),
        );

        if (missing) {
            setShowKeys(true);
            setErrors({
                [missing]: `Add your ${getProviderLabel(missing)} API key.`,
            });
            return;
        }

        // Freeze provider selections and API keys for this request.
        const requestSelections = selections.map((selection) => ({
            ...selection,
        }));

        const requestKeys = { ...keys };

        setBusy(true);
        setErrors({});
        setGeneralError(null);
        setStreaming({});
        setSources({});

        let activeId = id;
        let userMessageAdded = false;

        const collected: Partial<Record<Provider, string>> = {};
        const started = new Set<Provider>();
        const failed = new Set<Provider>();

        try {
            // Create a conversation if this is the first message.
            if (!activeId) {
                const created = await createConversation(
                    text.slice(0, 48) ||
                    filesToUpload[0]?.name.slice(0, 48) ||
                    "New Chat",
                    requestSelections[0]!.modelId,
                );

                activeId = created.id;
                setId(created.id);

                window.history.replaceState(
                    null,
                    "",
                    `/c/${created.id}`,
                );
            }

            // Upload attachments and collect their document IDs.
            const documentIds: string[] = [];

            for (const file of filesToUpload) {
                const formData = new FormData();
                formData.set("file", file);

                const uploadResponse = await fetch(
                    "/api/documents/upload",
                    {
                        method: "POST",
                        credentials: "same-origin",
                        body: formData,
                    },
                );

                const uploadData = await uploadResponse
                    .json()
                    .catch(() => ({}));

                if (!uploadResponse.ok) {
                    throw new Error(
                        uploadData.error ??
                        `Failed to upload ${file.name}.`,
                    );
                }

                const documentId = uploadData.document?.id;

                if (
                    typeof documentId !== "string" ||
                    !documentId
                ) {
                    throw new Error(
                        `No document ID returned for ${file.name}.`,
                    );
                }

                documentIds.push(documentId);
            }

            // Keep the attachments if upload failed before this point.
            setAttachedFiles((current) =>
                current.filter(
                    (file) => !filesToUpload.includes(file),
                ),
            );

            const userMessage: StoredMessage = {
                id: crypto.randomUUID(),
                role: "user",
                content: text,
            };

            setMessages((current) => [
                ...current,
                userMessage,
            ]);
            userMessageAdded = true;
            setDraft("");

            // Send the message and uploaded document IDs to the chat API.
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    id: activeId,
                    message: {
                        id: userMessage.id,
                        role: "user",
                        parts: [
                            {
                                type: "text",
                                text,
                            },
                        ],
                    },
                    selections: requestSelections,
                    keys: requestKeys,
                    documentIds,
                }),
            });

            if (!response.ok || !response.body) {
                const body = await response
                    .json()
                    .catch(() => ({}));

                throw new Error(
                    body.error ??
                    `Request failed (${response.status})`,
                );
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = "";

            function processFrame(frame: string) {
                const data = parseEventFrame(frame);

                if (!data) return;

                const provider = data.provider;

                if (
                    data.type === "sources" &&
                    provider &&
                    data.citations
                ) {
                    setSources((current) => ({
                        ...current,
                        [provider]: data.citations,
                    }));
                    return;
                }

                if (
                    data.type === "start" &&
                    provider &&
                    requestSelections.some(
                        (selection) =>
                            selection.provider === provider,
                    )
                ) {
                    started.add(provider);

                    setStreaming((current) => ({
                        ...current,
                        [provider]: "",
                    }));

                    return;
                }

                if (
                    data.type === "delta" &&
                    provider &&
                    requestSelections.some(
                        (selection) =>
                            selection.provider === provider,
                    )
                ) {
                    const chunk = data.text ?? "";

                    started.add(provider);

                    collected[provider] =
                        (collected[provider] ?? "") + chunk;

                    setStreaming((current) => ({
                        ...current,
                        [provider]:
                            (current[provider] ?? "") + chunk,
                    }));

                    return;
                }

                if (
                    data.type === "error" &&
                    provider &&
                    requestSelections.some(
                        (selection) =>
                            selection.provider === provider,
                    )
                ) {
                    failed.add(provider);

                    setErrors((current) => ({
                        ...current,
                        [provider]:
                            data.message ??
                            `${getProviderLabel(provider)} request failed.`,
                    }));

                    // Other providers can continue streaming.
                    setStreaming((current) => {
                        const next = { ...current };
                        delete next[provider];
                        return next;
                    });

                    return;
                }

                if (
                    data.type === "error" &&
                    !provider
                ) {
                    setGeneralError(
                        data.message ??
                        "The comparison request failed.",
                    );
                }
            }

            while (true) {
                const { value, done } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, {
                    stream: true,
                });

                // Handle LF and CRLF SSE frame separators.
                const frames = buffer.split(/\r?\n\r?\n/);
                buffer = frames.pop() ?? "";

                for (const frame of frames) {
                    processFrame(frame);
                }
            }

            // Flush remaining decoder bytes and the final SSE frame.
            buffer += decoder.decode();

            if (buffer.trim()) {
                processFrame(buffer);
            }

            const completedMessages: StoredMessage[] =
                requestSelections
                    .filter(
                        ({ provider }) =>
                            started.has(provider) &&
                            !failed.has(provider) &&
                            collected[provider] !== undefined,
                    )
                    .map(({ provider, modelId }) => ({
                        id: crypto.randomUUID(),
                        role: "assistant" as const,
                        content: collected[provider] ?? "",
                        provider,
                        modelId,
                    }));

            if (completedMessages.length > 0) {
                setMessages((current) => [
                    ...current,
                    ...completedMessages,
                ]);
            }

            router.refresh();
        } catch (error) {
            setGeneralError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong.",
            );

            // Avoid duplicating a message that was already added locally.
            if (userMessageAdded) {
                // The uploaded documents remain available in the account.
                // Retry behavior should be handled separately.
            }
        } finally {
            setBusy(false);
            setStreaming({});
        }
    }


    const liveEntries = selected.filter(
        (provider) =>
            streaming[provider] !== undefined || Boolean(errors[provider]),
    );

    return (
        <main className="flex min-h-0 flex-1 flex-col bg-background">
            <div className="flex min-h-0 flex-1 flex-col">
                <Conversation className="min-h-0 flex-1">
                    <ConversationContent className="mx-auto w-full max-w-4xl gap-6 px-4 py-8 md:px-6">
                        {messages.length === 0 && liveEntries.length === 0 ? (
                            <div className="flex min-h-[42vh] flex-col items-center justify-center text-center">
                                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                                    <Plus size={26} />
                                </div>

                                <h1 className="text-2xl font-semibold tracking-tight">
                                    Where should we begin?
                                </h1>

                                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                                    Choose one or more AI providers, add your
                                    API keys, and compare their responses.
                                </p>
                            </div>
                        ) : null}

                        {messages.map((message) => (
                            <div key={message.id} className="space-y-2">
                                {message.role === "assistant" &&
                                    (message.provider || message.modelId) ? (
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {message.provider} · {message.modelId}
                                    </p>
                                ) : null}

                                <Message from={message.role}>
                                    <MessageContent>
                                        <MessageResponse>
                                            {message.content}
                                        </MessageResponse>
                                    </MessageContent>
                                </Message>
                                {message.role === "assistant" && message.provider && sources[message.provider as Provider]?.length ? (
                                    <div className="ml-2 space-y-1 text-xs text-muted-foreground">
                                        <p className="font-medium">Sources</p>
                                        {sources[message.provider as Provider]!.map(source => <p key={source.chunkId}>[{source.index}] {source.documentName}</p>)}
                                    </div>
                                ) : null}
                            </div>
                        ))}

                        {liveEntries.map((provider) => (
                            <div key={provider} className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {getProviderLabel(provider)} ·{" "}
                                        {MODEL_OPTIONS[provider].label}
                                    </p>

                                    {errors[provider] ? (
                                        <span className="text-xs text-destructive">
                                            Failed
                                        </span>
                                    ) : busy ? (
                                        <span className="text-xs text-muted-foreground">
                                            Generating
                                        </span>
                                    ) : null}
                                </div>

                                <Message from="assistant">
                                    <MessageContent>
                                        {errors[provider] ? (
                                            <p
                                                role="alert"
                                                className="text-sm text-destructive"
                                            >
                                                {errors[provider]}
                                            </p>
                                        ) : streaming[provider] ? (
                                            <MessageResponse isAnimating>
                                                {streaming[provider]}
                                            </MessageResponse>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <LoaderCircle className="size-4 animate-spin" />
                                                Waiting for response...
                                            </div>
                                        )}
                                    </MessageContent>
                                </Message>
                                {sources[provider]?.length ? (
                                    <div className="ml-2 space-y-1 text-xs text-muted-foreground">
                                        <p className="font-medium">Sources</p>
                                        {sources[provider]!.map(source => <p key={source.chunkId}>[{source.index}] {source.documentName}</p>)}
                                    </div>
                                ) : null}
                            </div>
                        ))}

                        <ConversationScrollButton />
                    </ConversationContent>
                </Conversation>

                <div className="mx-auto w-full max-w-4xl px-4 pb-5 md:px-6">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        {PROVIDERS.map((provider) => {
                            const active = selected.includes(provider.id);

                            return (
                                <button
                                    key={provider.id}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => toggleProvider(provider.id)}
                                    aria-pressed={active}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-background hover:bg-accent"
                                        }`}
                                >
                                    {provider.label}
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => setShowKeys((value) => !value)}
                            className="ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:bg-accent"
                        >
                            {showKeys ? (
                                <X size={13} />
                            ) : (
                                <KeyRound size={13} />
                            )}
                            {showKeys ? "Hide keys" : "API keys"}
                        </button>
                    </div>

                    {generalError ? (
                        <p
                            role="alert"
                            className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                        >
                            {generalError}
                        </p>
                    ) : null}

                    {showKeys ? (
                        <div className="mb-3 grid gap-3 rounded-2xl border p-3 sm:grid-cols-3">
                            {PROVIDERS.filter((provider) =>
                                selected.includes(provider.id),
                            ).map((provider) => (
                                <label
                                    key={provider.id}
                                    className="grid gap-1.5 text-xs font-medium"
                                >
                                    {provider.label} API key

                                    <input
                                        type="password"
                                        autoComplete="off"
                                        spellCheck={false}
                                        value={keys[provider.id] ?? ""}
                                        disabled={busy}
                                        onChange={(event) =>
                                            updateApiKey(
                                                provider.id,
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Paste API key"
                                        className="h-9 min-w-0 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                    />

                                    {errors[provider.id] ? (
                                        <span className="text-destructive">
                                            {errors[provider.id]}
                                        </span>
                                    ) : null}
                                </label>
                            ))}

                            <p className="flex items-center gap-1 text-xs text-muted-foreground sm:col-span-3">
                                <ShieldCheck size={14} />
                                API keys are held in this pages React state
                                and sent with requests to NexGPT. This component
                                does not save them to conversation history.
                            </p>
                        </div>
                    ) : null}


                    <form
                        onSubmit={(event) => void sendMessage(event)}
                        className="rounded-3xl border bg-background p-3 shadow-sm focus-within:ring-1 focus-within:ring-ring"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.xlsx,.xls,.pptx,.js,.jsx,.ts,.tsx,.py,.java,.sql,.html,.css"
                            onChange={handleFilesSelected}
                        />

                        <textarea
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (
                                    event.key === "Enter" &&
                                    !event.shiftKey &&
                                    !event.nativeEvent.isComposing
                                ) {
                                    event.preventDefault();
                                    void sendMessage();
                                }
                            }}
                            placeholder="Message NexGPT…"
                            rows={2}
                            disabled={busy}
                            className="max-h-48 min-h-12 w-full resize-y bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                        />

                        {attachedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 px-2 py-2">
                                {attachedFiles.map((file, index) => (
                                    <div
                                        key={`${file.name}-${file.size}-${index}`}
                                        className="flex max-w-full items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-xs"
                                    >
                                        <FileText size={15} className="shrink-0" />

                                        <span className="max-w-48 truncate">
                                            {file.name}
                                        </span>

                                        <button
                                            type="button"
                                            aria-label={`Remove ${file.name}`}
                                            onClick={() => removeAttachedFile(index)}
                                            className="shrink-0 rounded-full p-1 hover:bg-muted"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <button
                                    type="button"
                                    aria-label="Attach files"
                                    title="Attach files"
                                    disabled={busy}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex size-9 shrink-0 items-center justify-center rounded-full border hover:bg-muted disabled:opacity-40"
                                >
                                    <Plus size={19} />
                                </button>

                                <span className="truncate text-xs text-muted-foreground">
                                    {selected.length} provider
                                    {selected.length === 1 ? "" : "s"} selected · Enter to send
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={
                                    busy ||
                                    (!draft.trim() && attachedFiles.length === 0) ||
                                    selected.length === 0
                                }
                                aria-label="Send message"
                                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                            >
                                {busy ? (
                                    <LoaderCircle size={17} className="animate-spin" />
                                ) : (
                                    <ArrowUp size={18} />
                                )}
                            </button>
                        </div>
                    </form>


                    <p className="mt-2 text-center text-xs text-muted-foreground">
                        NexGPT can make mistakes. Check important information.
                    </p>
                </div>
            </div>
        </main>
    );
}
