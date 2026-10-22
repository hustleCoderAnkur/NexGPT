
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
    Bot,
    ChevronDown,
    MessageSquare,
    Moon,
    MoreHorizontal,
    Pencil,
    Pin,
    PinOff,
    Plus,
    Search,
    Sun,
    Trash2,
    LogOut,
    Settings2,
    PanelLeft,
    PanelRight,
    Check,
    FileText,
    FlaskConical
} from "lucide-react";

import {
    useConversations,
    useCreateConversation,
    useDeleteConversation,
    useUpdateConversation,
} from "@/lib/services/conversations/hooks/use-conversation";

type ChatUser = {
    id: string;
    name: string | null;
    email: string;
};

function getInitials(user: ChatUser) {
    const value = user.name?.trim() || user.email;

    return value
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join("");
}

export function ChatShell({
    user,
    children,
}: {
    user: ChatUser;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();

    const [collapsed, setCollapsed] = useState(false);
    const [search, setSearch] = useState("");
    const [profileOpen, setProfileOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameTitle, setRenameTitle] = useState("");

    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    // Close the account menu when clicking outside it or pressing Escape.
    useEffect(() => {
        if (!profileOpen) return;

        function handlePointerDown(event: MouseEvent) {
            if (
                profileRef.current &&
                event.target instanceof Node &&
                !profileRef.current.contains(event.target)
            ) {
                setProfileOpen(false);
                setAppearanceOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setProfileOpen(false);
                setAppearanceOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [profileOpen]);

    const conversations = useConversations();
    const createChat = useCreateConversation();
    const deleteChat = useDeleteConversation();
    const updateChat = useUpdateConversation();

    const filteredChats = useMemo(() => {
        const chats = conversations.data ?? [];
        const query = search.trim().toLowerCase();

        if (!query) return chats;

        return chats.filter((chat) =>
            chat.title.toLowerCase().includes(query)
        );
    }, [conversations.data, search]);

    async function handleLogout() {
        if (loggingOut) return;

        setLoggingOut(true);

        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin",
            });

            if (!response.ok) {
                throw new Error("Logout failed");
            }

            router.replace("/login");
            router.refresh();
        } catch {
            setLoggingOut(false);
            window.alert("Could not log out. Please try again.");
        }
    }


    function saveRename(id: string) {
        const title = renameTitle.trim();
        const currentTitle = conversations.data?.find(
            (chat) => chat.id === id
        )?.title;

        if (!title || title.length > 200) {
            setRenamingId(null);
            return;
        }

        if (title !== currentTitle) {
            updateChat.mutate(
                { id, title },
                {
                    onSettled: () => {
                        setRenamingId(null);
                        setRenameTitle("");
                    },
                }
            );
        } else {
            setRenamingId(null);
            setRenameTitle("");
        }
    }

    return (
        <div className="flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
            <aside
                className={`flex h-full min-h-0 shrink-0 flex-col border-r-2 border-border bg-sidebar text-sidebar-foreground transition-[width] ${collapsed ? "w-[68px]" : "w-[272px]"
                    }`}
            >
                <div
                    className={`flex h-16 shrink-0 items-center border-b-2 border-border ${collapsed ? "justify-center px-2" : "justify-between px-3"
                        }`}
                >
                    {!collapsed && (
                        <Link
                            href="/"
                            aria-label="NexGPT home"
                            className="flex min-w-0 items-center gap-2 rounded-md p-2 text-sidebar-foreground hover:bg-[#dfff57] hover:text-[#171714]"
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-[#dfff57] text-[#171714] shadow-[2px_2px_0_#171714]">
                                <Bot size={19} />
                            </span>

                            <span className="truncate text-sm font-black">NexGPT</span>
                        </Link>
                    )}

                    <button
                        type="button"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-expanded={!collapsed}
                        onClick={() => setCollapsed((current) => !current)}
                        className="flex size-9 shrink-0 items-center justify-center rounded-md border-2 border-transparent text-sidebar-foreground hover:border-foreground hover:bg-[#dfff57] hover:text-[#171714] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfff57]"
                    >
                        {collapsed ? <PanelRight size={18} /> : <PanelLeft size={18} />}
                    </button>
                </div>

                <div className="space-y-1 px-3 pt-2">
                    <button
                        type="button"
                        disabled={createChat.isPending}
                        onClick={() => createChat.mutate()}
                        className="flex h-10 w-full items-center gap-3 rounded-md border-2 border-transparent px-3 text-sm font-black text-sidebar-foreground hover:border-foreground hover:bg-[#dfff57] hover:text-[#171714] disabled:opacity-50"
                    >
                        <Plus size={18} />
                        {!collapsed && (
                            <span>
                                {createChat.isPending ? "Creating..." : "New chat"}
                            </span>
                        )}
                    </button>

                    <div className="space-y-1 pt-1">
                        <Link href="/documents" title="Knowledge documents" className={`flex h-9 items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground hover:bg-[#dfff57] hover:text-[#171714] ${pathname.startsWith("/documents") ? "bg-[#dfff57] !text-[#171714] font-bold" : ""}`}>
                            <FileText size={17} />{!collapsed && <span>Documents</span>}
                        </Link>
                    </div>

                    {!collapsed && (
                        <label className="flex h-10 items-center gap-3 rounded-md border-2 border-foreground bg-card dark:bg-[#22221e] px-3 text-sm text-muted-foreground focus-within:bg-background">
                            <Search size={17} />

                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search chats"
                                className="min-w-0 flex-1 bg-transparent text-foreground outline-none"
                            />
                        </label>
                    )}
                </div>

                <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                    {!collapsed && (
                        <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                            Recent
                        </div>
                    )}

                    {conversations.isLoading && !collapsed && (
                        <p className="px-3 py-3 text-xs text-muted-foreground">
                            Loading conversations...
                        </p>
                    )}

                    {conversations.isError && !collapsed && (
                        <div className="px-3 py-3 text-xs text-destructive">
                            Could not load conversations.
                            <button
                                type="button"
                                className="ml-1 underline"
                                onClick={() => void conversations.refetch()}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {filteredChats.map((chat) => (
                        <div
                            key={chat.id}
                            className={`group mb-1 flex items-center rounded-md ${pathname === `/agents/c/${chat.id}`
                                ? "bg-[#dfff57] text-[#171714]"
                                : "text-sidebar-foreground hover:bg-[#dfff57] hover:text-[#171714]"
                                }`}
                        >
                            <Link
                                href={`/agents/c/${chat.id}`}
                                title={collapsed ? chat.title : undefined}
                                className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2.5 text-sm ${collapsed ? "justify-center" : ""
                                    }`}
                            >
                                <MessageSquare size={16} className="shrink-0" />

                                {!collapsed && (
                                    <>
                                        {renamingId === chat.id ? (
                                            <input
                                                autoFocus
                                                value={renameTitle}
                                                maxLength={200}
                                                onChange={(event) => setRenameTitle(event.target.value)}
                                                onClick={(event) => event.preventDefault()}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                        event.preventDefault();
                                                        saveRename(chat.id);
                                                    }

                                                    if (event.key === "Escape") {
                                                        setRenamingId(null);
                                                        setRenameTitle("");
                                                    }
                                                }}
                                                onBlur={() => {
                                                    // Save only via Enter or the check button.
                                                }}
                                                className="min-w-0 flex-1 rounded-md border bg-muted dark:bg-[#292923] px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                                                aria-label="Rename conversation"
                                            />
                                        ) : (
                                            <span className="min-w-0 flex-1 truncate">
                                                {chat.title}
                                            </span>
                                        )}

                                        {chat.isPinned && (
                                            <Pin size={13} className="shrink-0" />
                                        )}
                                    </>
                                )}
                            </Link>


                            {!collapsed && (
                                <div className="relative mr-1">
                                    <button
                                        type="button"
                                        aria-label={`Actions for ${chat.title}`}
                                        aria-expanded={openMenuId === chat.id}
                                        onClick={() =>
                                            setOpenMenuId((current) =>
                                                current === chat.id ? null : chat.id
                                            )
                                        }
                                        className="rounded-md p-1.5 text-sidebar-foreground hover:bg-muted"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>

                                    {openMenuId === chat.id && (
                                        <>
                                            <button
                                                type="button"
                                                aria-label="Close conversation menu"
                                                className="fixed inset-0 z-40 cursor-default"
                                                onClick={() => {
                                                    setOpenMenuId(null);

                                                    if (renamingId === chat.id) {
                                                        saveRename(chat.id);
                                                    }
                                                }}
                                            />

                                            <div className="absolute right-0 top-8 z-50 w-40 rounded-md border-2 border-foreground bg-card dark:bg-[#22221e] p-1 text-foreground shadow-[4px_4px_0_#171714]">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        updateChat.mutate(
                                                            { id: chat.id, isPinned: !chat.isPinned }
                                                        );
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-popover-foreground hover:bg-[#dfff57] hover:text-[#171714]"
                                                >
                                                    {chat.isPinned ? (
                                                        <PinOff size={14} />
                                                    ) : (
                                                        <Pin size={14} />
                                                    )}
                                                    {chat.isPinned ? "Unpin chat" : "Pin chat"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRenameTitle(chat.title);
                                                        setRenamingId(chat.id);
                                                    }}
                                                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-popover-foreground hover:bg-[#dfff57] hover:text-[#171714]"
                                                >
                                                    <Pencil size={14} />
                                                    Rename
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={deleteChat.isPending}
                                                    onClick={() => {
                                                        setOpenMenuId(null);
                                                        deleteChat.mutate(chat.id);
                                                    }}
                                                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-destructive hover:bg-[#dfff57] hover:text-[#171714] disabled:opacity-50"
                                                >
                                                    <Trash2 size={14} />
                                                    {deleteChat.isPending ? "Deleting..." : "Delete"}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                        </div>
                    ))}

                    {!conversations.isLoading &&
                        !conversations.isError &&
                        filteredChats.length === 0 &&
                        !collapsed && (
                            <p className="px-3 py-4 text-xs text-muted-foreground">
                                {search
                                    ? "No matching conversations."
                                    : "Your conversations will appear here."}
                            </p>
                        )}
                </div>

                <div ref={profileRef} className="relative shrink-0 border-t-2 border-foreground p-2">
                    <button
                        type="button"
                        onClick={() => setProfileOpen((value) => !value)}
                        className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sidebar-foreground hover:bg-[#dfff57] hover:text-[#171714]"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-black uppercase tracking-[0.12em] text-primary-foreground">
                            {getInitials(user)}
                        </span>

                        {!collapsed && (
                            <>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-bold">
                                        {user.name || "Your account"}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </span>
                                </span>
                                <ChevronDown size={15} />
                            </>
                        )}
                    </button>

                    {profileOpen && (
                        <div
                            className={`absolute bottom-2 z-[60] w-64 rounded-md border-2 border-foreground bg-popover p-2 text-popover-foreground shadow-[5px_5px_0_#171714] dark:shadow-[5px_5px_0_#d5ff45] ${collapsed ? "left-[68px] ml-2" : "left-2"
                                }`}
                        >
                            <div className="border-b px-3 py-3">
                                <p className="truncate text-sm font-black">
                                    {user.name || "Your account"}
                                </p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {user.email}
                                </p>
                            </div>


                            <div className="px-1 py-2">
                                <button
                                    type="button"
                                    onClick={() => setAppearanceOpen((open) => !open)}
                                    aria-expanded={appearanceOpen}
                                    className="flex w-full items-center justify-between rounded-md px-2 py-2.5 text-sm text-popover-foreground hover:bg-[#dfff57] hover:text-[#171714]"
                                >
                                    <span>Appearance</span>

                                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {theme === "system"
                                            ? "System"
                                            : theme === "light"
                                                ? "Light"
                                                : theme === "dark"
                                                    ? "Dark"
                                                    : "System"}

                                        <ChevronDown
                                            size={14}
                                            className={`transition-transform ${appearanceOpen ? "rotate-180" : ""
                                                }`}
                                        />
                                    </span>
                                </button>

                                {appearanceOpen && (
                                    <div className="mt-1 space-y-1 rounded-md bg-muted dark:bg-[#292923] p-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTheme("light");
                                                setAppearanceOpen(false);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-[#dfff57] hover:text-[#171714]"
                                        >
                                            <Sun size={16} />
                                            <span className="flex-1 text-left">Light</span>
                                            {theme === "light" && <Check size={15} />}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTheme("dark");
                                                setAppearanceOpen(false);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-[#dfff57] hover:text-[#171714]"
                                        >
                                            <Moon size={16} />
                                            <span className="flex-1 text-left">Dark</span>
                                            {theme === "dark" && <Check size={15} />}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTheme("system");
                                                setAppearanceOpen(false);
                                            }}
                                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-[#dfff57] hover:text-[#171714]"
                                        >
                                            <Settings2 size={16} />
                                            <span className="flex-1 text-left">System</span>
                                            {theme === "system" && <Check size={15} />}
                                        </button>
                                    </div>
                                )}
                            </div>


                            <div className="border-t pt-2">
                                <button
                                    type="button"
                                    disabled={loggingOut}
                                    onClick={() => void handleLogout()}
                                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-destructive hover:bg-[#dfff57] hover:text-[#171714] disabled:opacity-50"
                                >
                                    <LogOut size={16} />
                                    <span>{loggingOut ? "Logging out..." : "Log out"}</span>
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
                {children}
            </main>
        </div>
    );
}
