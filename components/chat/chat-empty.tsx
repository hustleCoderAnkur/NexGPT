import { ArrowUpRight, MessageSquareText, Sparkles } from "lucide-react";

import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";

/** Brutalist empty state shown before the first message is sent. */
export function ChatEmpty() {
    return (
        <div className="flex flex-1 items-center justify-center overflow-y-auto bg-[#f4f0e8] px-4 py-10 text-[#171714] dark:bg-[#171714] dark:text-[#f4f0e8]">
            <Empty className="w-full max-w-2xl border-0 bg-transparent py-8">
                <EmptyHeader className="items-start text-left">
                    <EmptyMedia
                        variant="icon"
                        className="mb-3 flex size-16 items-center justify-center rounded-none border-2 border-[#171714] bg-[#c7ff4f] text-[#171714] shadow-[5px_5px_0_#171714] dark:border-[#f4f0e8] dark:shadow-[5px_5px_0_#f4f0e8]"
                    >
                        <MessageSquareText className="size-7" strokeWidth={2.2} />
                    </EmptyMedia>

                    <div className="mb-3 flex items-center gap-2 border-2 border-[#171714] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] dark:border-[#f4f0e8]">
                        <Sparkles className="size-3.5" />
                        Your AI workspace
                    </div>

                    <EmptyTitle className="max-w-xl text-left text-4xl font-black uppercase leading-[0.98] tracking-[-0.055em] sm:text-5xl md:text-6xl">
                        What are we
                        <br />
                        figuring out?
                    </EmptyTitle>

                    <EmptyDescription className="mt-3 max-w-md text-left text-sm leading-6 text-[#66645d] dark:text-[#b7b4aa] sm:text-base">
                        Ask a question, explore an idea, or work through a
                        problem. Your conversation starts here.
                    </EmptyDescription>
                </EmptyHeader>

                <div className="mt-8 flex w-full max-w-xl flex-wrap items-center justify-between gap-3 border-2 border-[#171714] bg-[#fffdf7] px-4 py-3 shadow-[4px_4px_0_#171714] dark:border-[#f4f0e8] dark:bg-[#22221f] dark:shadow-[4px_4px_0_#f4f0e8]">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#66645d] dark:text-[#b7b4aa]">
                        Start with a prompt
                    </span>
                    <ArrowUpRight className="size-5" />
                </div>
            </Empty>
        </div>
    );
}
