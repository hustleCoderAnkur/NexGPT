"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
    ArrowUp,
    ChevronLeft,
    ChevronRight,
    Columns2,
    Copy,
    FileText,
    KeyRound,
    LoaderCircle,
    Plus,
    ShieldCheck,
    ThumbsUp,
    ThumbsDown,
    Volume2,
    Share2,
    Check,
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


import { OpenAI, Gemini, Anthropic } from "@lobehub/icons";

function ProviderLogo({ provider }: { provider?: Provider }) {
    switch (provider) {
        case "openai":
            return <OpenAI size={22} />;
        case "google":
            return <Gemini size={22} />;
        case "anthropic":
            return <Anthropic size={22} />;
        default:
            return <span className="text-sm font-bold">AI</span>;
    }
}


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
    attachments?: { documentId: string; name: string; size: number; type: string }[];
};

type MessageTurn = {
    user: StoredMessage;
    assistants: StoredMessage[];
};

function groupMessagesIntoTurns(messages: StoredMessage[]): MessageTurn[] {
    const turns: MessageTurn[] = [];
    let currentTurn: MessageTurn | null = null;

    for (const message of messages) {
        if (message.role === "user") {
            currentTurn = { user: message, assistants: [] };
            turns.push(currentTurn);
        } else if (currentTurn) {
            currentTurn.assistants.push(message);
        } else {
            // Keep legacy assistant-only history visible if it exists.
            turns.push({
                user: {
                    id: `legacy-user-${message.id}`,
                    role: "user",
                    content: "",
                },
                assistants: [message],
            });
        }
    }

    return turns;
}

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

function AssistantResponseCard({
    message,
    sources,
    copied,
    onCopy,
}: {
    message: StoredMessage;
    sources?: NonNullable<EventData["citations"]>;
    copied: boolean;
    onCopy: () => void | Promise<void>;
}) {
    const provider = message.provider as Provider | undefined;
    const label = provider ? getProviderLabel(provider) : "AI assistant";
    const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
    return (
        <article className="min-w-0 overflow-hidden border-2 border-neutral-950 bg-[#fffdf7] text-neutral-950 shadow-[5px_5px_0_0_#171717] transition-shadow duration-200 hover:shadow-[7px_7px_0_0_#171717] dark:border-neutral-100 dark:bg-neutral-950 dark:text-neutral-50 dark:shadow-[5px_5px_0_0_#a3e635]">
            <header className="flex items-center justify-between gap-3 border-b-2 border-neutral-950 bg-lime-300 px-4 py-3 text-neutral-950 dark:border-neutral-100 dark:bg-lime-300">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-9 shrink-0 items-center justify-center border-2 border-neutral-950 bg-[#fffdf7] text-neutral-950">
                        <ProviderLogo provider={provider} />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{label}</p>
                        <p className="truncate text-xs text-muted-foreground">{message.modelId ?? "AI response"}</p>
                    </div>
                </div>
                <button type="button" onClick={() => void onCopy()} className="inline-flex shrink-0 items-center gap-1.5 border-2 border-neutral-950 bg-[#fffdf7] px-2.5 py-1.5 text-xs font-bold transition-transform hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white" aria-label="Copy response"><Copy size={13} />{copied ? "Copied" : "Copy"}</button>
            </header>
            <div className="p-4">
                <Message from="assistant"><MessageContent><MessageResponse>{message.content}</MessageResponse></MessageContent></Message>
            </div>
            {sources?.length ? <details className="border-t px-4 py-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium">Sources · {sources.length} relevant chunk{sources.length === 1 ? "" : "s"}</summary>
                <div className="mt-2 space-y-1">{sources.map((source) => <p key={source.chunkId}>[{source.index}] {source.documentName} · relevance {source.score.toFixed(2)}</p>)}</div>
            </details> : null}

            <div className="mt-3 flex items-center gap-1 border-t-2 border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
                <button type="button" onClick={() => void onCopy()} title={copied ? "Copied" : "Copy response"} aria-label={copied ? "Copied response" : "Copy response"} className="rounded-md p-2 text-neutral-500 transition-all hover:bg-neutral-950 hover:text-white dark:hover:bg-lime-300 dark:hover:text-neutral-950">
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                </button>

                <button
                    type="button"
                    onClick={() => setFeedback(feedback === "up" ? null : "up")}
                    title="Good response"
                    aria-label="Good response"
                    aria-pressed={feedback === "up"}
                    className={`group rounded-lg p-2 transition-all duration-200 hover:bg-green-500/10 active:scale-90 ${feedback === "up"
                        ? "scale-110 text-green-500"
                        : "text-muted-foreground hover:text-green-500"
                        }`}
                >
                    <ThumbsUp
                        size={17}
                        className={`transition-all duration-200 ${feedback === "up"
                            ? "animate-[feedback-pop_350ms_ease-out] fill-green-500/20"
                            : "group-hover:-translate-y-0.5"
                            }`}
                    />
                </button>

                <button
                    type="button"
                    onClick={() => setFeedback(feedback === "down" ? null : "down")}
                    title="Bad response"
                    aria-label="Bad response"
                    aria-pressed={feedback === "down"}
                    className={`group rounded-lg p-2 transition-all duration-200 hover:bg-red-500/10 active:scale-90 ${feedback === "down"
                        ? "scale-110 text-red-500"
                        : "text-muted-foreground hover:text-red-500"
                        }`}
                >
                    <ThumbsDown
                        size={17}
                        className={`transition-all duration-200 ${feedback === "down"
                            ? "animate-[feedback-shake_350ms_ease-out] fill-red-500/20"
                            : "group-hover:translate-y-0.5"
                            }`}
                    />
                </button>

                <button type="button" onClick={() => {
                    if (!("speechSynthesis" in window)) return;
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(new SpeechSynthesisUtterance(message.content));
                }} title="Read aloud" aria-label="Read response aloud" className="rounded-md p-2 text-neutral-500 transition-all hover:bg-neutral-950 hover:text-white dark:hover:bg-lime-300 dark:hover:text-neutral-950">
                    <Volume2 size={17} />
                </button>
                <button type="button" onClick={() => {
                    if (navigator.share) {
                        void navigator.share({ title: `${label} response`, text: message.content }).catch(() => { });
                    } else {
                        void navigator.clipboard.writeText(message.content);
                    }
                }} title="Share response" aria-label="Share response" className="rounded-md p-2 text-neutral-500 transition-all hover:bg-neutral-950 hover:text-white dark:hover:bg-lime-300 dark:hover:text-neutral-950">
                    <Share2 size={17} />
                </button>
            </div>
        </article>
    );
}

export function ChatWorkspace({
    conversationId,
    initialMessages = [],
}: {
    conversationId?: string;
    initialMessages?: StoredMessage[];
}) {
    const [id, setId] = useState(conversationId);
    const [messages, setMessages] =
        useState<StoredMessage[]>(initialMessages);
    const [draft, setDraft] = useState("");
    const [selected, setSelected] = useState<Provider[]>(["openai"]);
    const [keys, setKeys] = useState<Partial<Record<Provider, string>>>({});
    const [showKeys, setShowKeys] = useState(false);
    const [busy, setBusy] = useState(false);
    const [responseView, setResponseView] = useState<"swipe" | "compare">("swipe");
    const [activeResponse, setActiveResponse] = useState(0);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [statusPhraseIndex, setStatusPhraseIndex] = useState(0);
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

    // Keep each assistant response attached to the user turn that triggered it.
    const turns = useMemo(() => groupMessagesIntoTurns(messages), [messages]);

    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

    const statusPhrases = [
        "Analyzing",
        "Interpreting",
        "Reasoning",
        "Inferring",
        "Reflecting",
        "Evaluating",
        "Synthesizing",
        "Contextualizing",
        "Disambiguating",
        "Extrapolating",
        "Correlating",
        "Decomposing",
        "Reformulating",
        "Reassessing",
        "Prioritizing",
        "Verifying",
        "Revising",
        "Elaborating",
        "Formulating",
        "Composing",
        "Articulating",
        "Generating",
        "Elucidating",
        "Summarizing",
        "Refining",
        "Consolidating",
        "Responding",
        "Finalizing",
    ];


    const fileInputRef = useRef<HTMLInputElement>(null);




    useEffect(() => {
        if (!busy) return;

        const timer = window.setInterval(() => {
            setStatusPhraseIndex((index) => {
                if (statusPhrases.length <= 1) return index;

                let nextIndex;

                do {
                    nextIndex = Math.floor(
                        Math.random() * statusPhrases.length
                    );
                } while (nextIndex === index);

                return nextIndex;
            });
        }, 2600);

        return () => window.clearInterval(timer);
    }, [busy, statusPhrases.length]);




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

        const removingProvider = selected.includes(provider);
        if (removingProvider && selected.length <= 2) {
            setResponseView("swipe");
            setActiveResponse(0);
        }

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


        setStatusPhraseIndex(0);
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
                    `/agents/c/${created.id}`,
                );
            }

            // Upload attachments and collect their document IDs.
            const uploadedDocuments: { documentId: string; name: string; size: number; type: string }[] = [];
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
                uploadedDocuments.push({
                    documentId,
                    name: file.name,
                    size: file.size,
                    type: file.type || "application/octet-stream",
                });
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
                content: text || (uploadedDocuments.length === 1
                    ? `Please summarize the attached document: ${uploadedDocuments[0]!.name}`
                    : `Please summarize these ${uploadedDocuments.length} attached documents.`),
                attachments: uploadedDocuments,
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
                                text: text || (uploadedDocuments.length === 1
                                    ? `Please summarize the attached document: ${uploadedDocuments[0]!.name}`
                                    : `Please summarize these ${uploadedDocuments.length} attached documents.`),
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


    return (
        <main className="flex min-h-0 flex-1 flex-col bg-[#f4f0e8] text-neutral-950 dark:bg-[#11110f] dark:text-neutral-50">
            <div className="flex min-h-0 flex-1 flex-col">
                <Conversation className="min-h-0 flex-1">
                    <ConversationContent className="mx-auto w-full max-w-5xl gap-8 px-4 py-8 md:px-8 lg:py-10">
                        {messages.length === 0 ? (
                            <div className="relative flex min-h-[48vh] flex-col items-center justify-center overflow-hidden border-2 border-neutral-950 bg-[#fffdf7] px-5 py-12 text-center shadow-[7px_7px_0_0_#171717] dark:border-neutral-100 dark:bg-neutral-950 dark:shadow-[7px_7px_0_0_#a3e635]">
                                <div className="mb-6 flex size-16 items-center justify-center border-2 border-neutral-950 bg-lime-300 text-neutral-950 shadow-[4px_4px_0_0_#171717]">
                                    <Plus size={26} />
                                </div>

                                <h1 className="text-3xl font-black uppercase leading-[0.95] tracking-[-0.07em] sm:text-5xl">
                                    Where should we begin?
                                </h1>

                                <p className="mt-4 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-300 sm:text-base">
                                    Choose one or more AI providers, add your
                                    API keys, and compare their responses.
                                </p>
                            </div>
                        ) : null}


                        {turns.map((turn, turnIndex) => {
                            const isLatestTurn = turnIndex === turns.length - 1;
                            const liveProviders = isLatestTurn
                                ? selected.filter((provider) =>
                                    streaming[provider] !== undefined ||
                                    Boolean(errors[provider]),
                                )
                                : [];
                            const turnResponses = turn.assistants;
                            const responseCount = turnResponses.length;
                            const safeActiveResponse = Math.min(
                                activeResponse,
                                Math.max(0, responseCount - 1),
                            );
                            const visibleResponses = responseView === "swipe"
                                ? turnResponses.slice(safeActiveResponse, safeActiveResponse + 1)
                                : turnResponses;

                            return (
                                <section key={turn.user.id} className="space-y-4">
                                    {turn.user.attachments?.length ? (
                                        <div className="ml-auto flex max-w-3xl flex-wrap justify-end gap-2">
                                            {turn.user.attachments.map((file) => (
                                                <div
                                                    key={file.documentId}
                                                    className="flex max-w-full items-center gap-2 border-2 border-neutral-950 bg-[#fffdf7] px-3 py-2 text-xs shadow-[3px_3px_0_0_#171717] dark:border-neutral-100 dark:bg-neutral-900"
                                                >
                                                    <FileText size={17} className="shrink-0 text-primary" />
                                                    <div className="min-w-0">
                                                        <p className="max-w-64 truncate font-medium">{file.name}</p>
                                                        <p className="text-muted-foreground">
                                                            {(file.size / 1024).toFixed(file.size < 1024 * 1024 ? 0 : 1)}{" "}
                                                            {file.size < 1024 * 1024 ? "KB" : "MB"} · Attached
                                                        </p>
                                                    </div>
                                                    <Check size={14} className="shrink-0 text-emerald-500" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    {turn.user.content ? (
                                        <div className="ml-auto max-w-3xl border-l-4 border-lime-400 pl-3">
                                            <Message from="user">
                                                <MessageContent>
                                                    <MessageResponse>{turn.user.content}</MessageResponse>
                                                </MessageContent>
                                            </Message>
                                        </div>
                                    ) : null}

                                    {(responseCount > 0 || liveProviders.length > 0) ? (
                                        <div className="space-y-3">
                                            {responseCount > 0 && (
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <h2 className="text-sm font-semibold">Model responses</h2>
                                                        <p className="text-xs text-muted-foreground">
                                                            Answers to this message from your selected providers.
                                                        </p>
                                                    </div>
                                                    {selected.length >= 2 && responseCount >= 2 && (
                                                        <div className="inline-flex border-2 border-neutral-950 bg-[#fffdf7] p-1 dark:border-neutral-100 dark:bg-neutral-900">
                                                            <button
                                                                type="button"
                                                                onClick={() => setResponseView("swipe")}
                                                                aria-pressed={responseView === "swipe"}
                                                                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${responseView === "swipe" ? "bg-neutral-950 text-white dark:bg-lime-300 dark:text-neutral-950" : "hover:bg-lime-100 dark:hover:bg-neutral-800"}`}
                                                            >
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <ChevronLeft size={13} /><ChevronRight size={13} /> Swipe
                                                                </span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setResponseView("compare")}
                                                                aria-pressed={responseView === "compare"}
                                                                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${responseView === "compare" ? "bg-neutral-950 text-white dark:bg-lime-300 dark:text-neutral-950" : "hover:bg-lime-100 dark:hover:bg-neutral-800"}`}
                                                            >
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <Columns2 size={14} /> Compare
                                                                </span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {responseView === "swipe" && responseCount >= 2 && (
                                                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                                    <span>Response {safeActiveResponse + 1} of {responseCount}</span>
                                                    <div className="flex gap-1">
                                                        <button
                                                            type="button"
                                                            aria-label="Previous response"
                                                            disabled={safeActiveResponse <= 0}
                                                            onClick={() => setActiveResponse((index) => Math.max(0, index - 1))}
                                                            className="border-2 border-neutral-950 p-1.5 transition-colors hover:bg-lime-300 disabled:opacity-30 dark:border-neutral-100"
                                                        >
                                                            <ChevronLeft size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label="Next response"
                                                            disabled={safeActiveResponse >= responseCount - 1}
                                                            onClick={() => setActiveResponse((index) => Math.min(responseCount - 1, index + 1))}
                                                            className="border-2 border-neutral-950 p-1.5 transition-colors hover:bg-lime-300 disabled:opacity-30 dark:border-neutral-100"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className={responseView === "compare" && responseCount >= 2
                                                ? "grid grid-cols-1 gap-5 xl:grid-cols-2"
                                                : "space-y-5"}
                                            >
                                                {visibleResponses.map((message) => (
                                                    <AssistantResponseCard
                                                        key={message.id}
                                                        message={message}
                                                        sources={message.provider ? sources[message.provider as Provider] : undefined}
                                                        copied={copiedMessageId === message.id}
                                                        onCopy={async () => {
                                                            await navigator.clipboard.writeText(message.content);
                                                            setCopiedMessageId(message.id);
                                                            window.setTimeout(() => setCopiedMessageId(null), 1500);
                                                        }}
                                                    />
                                                ))}
                                            </div>

                                            {liveProviders.map((provider) => (
                                                <AssistantResponseCard
                                                    key={`live-${turn.user.id}-${provider}`}
                                                    message={{
                                                        id: `live-${turn.user.id}-${provider}`,
                                                        role: "assistant",
                                                        provider,
                                                        modelId: MODEL_OPTIONS[provider].id,
                                                        content: streaming[provider] ?? errors[provider] ?? `${statusPhrases[statusPhraseIndex]}…`,
                                                    }}
                                                    copied={false}
                                                    onCopy={async () => {
                                                        await navigator.clipboard.writeText(streaming[provider] ?? "");
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </section>
                            );
                        })}

                        {busy && turns.length === 0 && (
                            <div className="flex items-center gap-3 border-2 border-neutral-950 bg-lime-100 px-4 py-3 dark:border-neutral-100 dark:bg-neutral-900" aria-live="polite">
                                <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">{statusPhrases[statusPhraseIndex]}…</p>
                            </div>
                        )}

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
                                    className={`border-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-all disabled:cursor-not-allowed disabled:opacity-50 ${active
                                        ? "border-neutral-950 bg-lime-300 text-neutral-950 shadow-[3px_3px_0_0_#171717] dark:border-lime-300"
                                        : "border-neutral-300 bg-[#fffdf7] hover:border-neutral-950 hover:bg-lime-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-lime-300"
                                        }`}
                                >
                                    {provider.label}
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => setShowKeys((value) => !value)}
                            className="ml-auto inline-flex items-center gap-1.5 border-2 border-neutral-950 bg-[#fffdf7] px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-lime-200 dark:border-neutral-100 dark:bg-neutral-900"
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
                        <div className="mb-3 grid gap-3 border-2 border-neutral-950 bg-[#fffdf7] p-4 sm:grid-cols-3 dark:border-neutral-100 dark:bg-neutral-950">
                            {PROVIDERS.filter((provider) =>
                                selected.includes(provider.id),
                            ).map((provider) => (
                                <label
                                    key={provider.id}
                                    className="grid gap-1.5 text-xs font-medium"
                                >
                                    {provider.label} API key

                                    <input
                                        type="text"
                                        name={`api-key-${provider.id}`}
                                        autoComplete="new-password"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        value={keys[provider.id] ?? ""}
                                        disabled={busy}
                                        onChange={(event) =>
                                            updateApiKey(provider.id, event.target.value)
                                        }
                                        placeholder="Paste API key"
                                        className="h-10 min-w-0 rounded-none border-2 border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-950 focus:ring-2 focus:ring-lime-300 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
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
                        className="rounded-none border-2 border-neutral-950 bg-[#fffdf7] p-3 shadow-[6px_6px_0_0_#171717] transition-all focus-within:shadow-[8px_8px_0_0_#a3e635] dark:border-neutral-100 dark:bg-neutral-950 dark:shadow-[6px_6px_0_0_#a3e635]"
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
                            className="max-h-48 min-h-20 w-full resize-y bg-transparent px-3 py-3 text-[15px] leading-6 outline-none placeholder:text-neutral-400 disabled:opacity-50"
                        />

                        {attachedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 px-2 py-2">
                                {attachedFiles.map((file, index) => (
                                    <div
                                        key={`${file.name}-${file.size}-${index}`}
                                        className="flex max-w-full items-center gap-2 border-2 border-neutral-950 bg-lime-100 px-3 py-2 text-xs dark:border-neutral-100 dark:bg-neutral-900"
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

                        <div className="flex items-center justify-between px-1 pt-1">
                            {/* Bottom left: attach files */}
                            <button
                                type="button"
                                aria-label="Attach files"
                                title="Attach files"
                                disabled={busy}
                                onClick={() => fileInputRef.current?.click()}
                                className="flex size-10 shrink-0 items-center justify-center border-2 border-neutral-950 bg-white transition-all hover:-translate-y-0.5 hover:bg-lime-200 disabled:opacity-40 dark:border-neutral-100 dark:bg-neutral-900"
                            >
                                <Plus size={21} />
                            </button>

                            {/* Bottom right: send */}
                            <button
                                type="submit"
                                disabled={
                                    busy ||
                                    (!draft.trim() && attachedFiles.length === 0) ||
                                    selected.length === 0
                                }
                                aria-label="Send message"
                                className="flex size-11 shrink-0 items-center justify-center border-2 border-neutral-950 bg-lime-300 text-neutral-950 shadow-[3px_3px_0_0_#171717] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40"
                            >
                                {busy ? (
                                    <LoaderCircle size={17} className="animate-spin" />
                                ) : (
                                    <ArrowUp size={18} />
                                )}
                            </button>
                        </div>
                    </form>

                    <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
                        NexGPT can make mistakes. Check important information.
                    </p>

                </div>
            </div>
        </main>
    );
}
