
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

function GoogleIcon() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 48 48"
            className="size-5 shrink-0"
        >
            <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
            />
            <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z"
            />
            <path
                fill="#FBBC05"
                d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"
            />
            <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.91-5.89l-7.62-5.91c-2.12 1.42-4.83 2.26-8.29 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
            />
        </svg>
    );
}

export default function GoogleSignInButton({
    intent,
}: {
    intent: "login" | "register";
}) {
    const [loading, setLoading] = useState(false);

    function handleGoogleSignIn() {
        if (loading) return;

        setLoading(true);

        const url = new URL(
            "/api/auth/google",
            window.location.origin,
        );

        url.searchParams.set("intent", intent);

        window.location.href = url.toString();
    }

    return (
        <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleGoogleSignIn}
            aria-label="Continue with Google"
            className="
    group relative flex h-12 w-full items-center
    justify-center gap-3 overflow-hidden
    rounded-lg border border-neutral-300
    bg-white px-5 text-sm font-semibold
    text-neutral-800! shadow-sm
    transition-all duration-200
    hover:border-neutral-400
    hover:bg-neutral-100! hover:text-neutral-700!
    hover:shadow-md
    active:scale-[0.99]
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-neutral-900
    focus-visible:ring-offset-2
    disabled:cursor-not-allowed
    disabled:opacity-70
    disabled:shadow-none
"
        >
            <span className="flex size-7 items-center justify-center">
                {loading ? (
                    <Loader2
                        className="size-5 animate-spin text-neutral-600"
                        aria-hidden="true"
                    />
                ) : (
                    <GoogleIcon />
                )}
            </span>

            <span>
                {loading
                    ? "Connecting to Google..."
                    : "Continue with Google"}
            </span>
        </Button>
    );
}
