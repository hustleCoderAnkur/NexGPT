"use client";

import * as React from "react";
import { ArrowUpIcon } from "lucide-react";

import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupTextarea,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ChatComposerProps = {
    onSend: (content: string) => Promise<void> | void;
    isSending?: boolean;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
};

/**
 * Message input form with send button. Enter sends; Shift+Enter inserts a newline.
 */
export function ChatComposer({
    onSend,
    isSending = false,
    placeholder = "Message NexGPT…",
    className,
    autoFocus = false,
}: ChatComposerProps) {
    const [value, setValue] = React.useState("");
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        if (autoFocus) {
            textareaRef.current?.focus();
        }
    }, [autoFocus]);

    /** Submits the current message when the form is submitted or Enter is pressed. */
    async function handleSubmit(event?: React.FormEvent) {
        event?.preventDefault();
        const content = value.trim();
        if (!content || isSending) return;

        setValue("");
        await onSend(content);
        textareaRef.current?.focus();
    }

    /** Handles keyboard shortcuts — Enter to send, Shift+Enter for a new line. */
    function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit();
        }
    }

    const canSend = value.trim().length > 0 && !isSending;

    return (
        <form
            onSubmit={(event) => void handleSubmit(event)}
            className={cn("mx-auto w-full max-w-4xl px-4 pb-4 md:px-6", className)}
        >
            <InputGroup className="group h-auto min-h-16 rounded-2xl border-2 border-black bg-[#fffdf7] shadow-[4px_4px_0_#171717] transition-shadow focus-within:shadow-[6px_6px_0_#b7f34a] dark:border-white dark:bg-[#171717] dark:shadow-[4px_4px_0_#b7f34a]">
                <InputGroupTextarea
                    ref={textareaRef}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isSending}
                    rows={1}
                    className="max-h-48 min-h-14 resize-none border-0 bg-transparent py-4 pl-4 pr-2 text-[15px] leading-relaxed text-[#171717] outline-none placeholder:text-black/45 focus-visible:ring-0 dark:text-[#fffdf7] dark:placeholder:text-white/40"
                />
                <InputGroupAddon align="inline-end" className="self-end pb-2 pr-2">
                    <InputGroupButton
                        type="submit"
                        size="icon-sm"
                        variant="default"
                        disabled={!canSend}
                        className="size-10 rounded-xl border-2 border-black bg-[#b7f34a] text-black shadow-[2px_2px_0_#171717] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:border-black/20 disabled:bg-black/10 disabled:text-black/30 disabled:shadow-none dark:border-white dark:bg-[#b7f34a] dark:text-black dark:shadow-[2px_2px_0_#fffdf7] dark:disabled:border-white/20 dark:disabled:bg-white/10 dark:disabled:text-white/30"
                        aria-label="Send message"
                    >
                        {isSending ? <Spinner /> : <ArrowUpIcon />}
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
            <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/50">
                ChaiGPT can make mistakes. Check important info.
            </p>
        </form>
    );
}