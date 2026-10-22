"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowDownRight,
    ArrowRight,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";

const OIDC_ERRORS: Record<string, string> = {
    google_signin_failed: "Google sign-in failed. Please try again.",
    google_email_not_verified: "Your Google email must be verified.",
    google_account_exists: "This Google account is already registered. Please sign in.",
    google_account_not_registered: "No account found for this Google identity. Please register first.",
    account_link_required:
        "An account with this email already exists. Sign in with your password first; accounts are not automatically linked.",
    invalid_google_flow: "Your sign-in session expired. Please try again.",
    missing_access_token: "Sign-in could not be completed. Please try again.",
    token_storage_failed: "Unable to save your sign-in session in this browser.",
};

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(
        OIDC_ERRORS[searchParams.get("error") ?? ""] ?? ""
    );
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error ?? "Unable to sign in. Please try again.");
                return;
            }
            router.replace("/agents");
        } catch {
            setError("Something went wrong. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f0e8] px-4 py-10 text-[#171717] selection:bg-lime-300">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute left-6 top-7 hidden text-xs font-black uppercase tracking-[0.3em] md:block"
            >
                Independent minds.
                <br />
                Uncommon ideas.
            </div>

            <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-7 right-6 hidden text-right text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 md:block"
            >
                NexGPT®
                <br />
                Built for what&apos;s next.
            </div>

            <section className="relative w-full max-w-115">
                <div className="mb-5 flex items-center justify-between">
                    <Link href="/" className="text-xl font-black tracking-[-0.08em]">
                        NEXGPT<span className="text-lime-600">.</span>
                    </Link>

                    <span className="border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
                        Member access
                    </span>
                </div>

                <div className="border-[3px] border-black bg-[#fffdf8] shadow-[8px_8px_0_0_#171717] sm:shadow-[12px_12px_0_0_#171717]">
                    <div className="border-b-[3px] border-black bg-lime-300 p-6 sm:p-8">
                        <div className="mb-8 flex items-start justify-between">
                            <span className="inline-flex h-11 w-11 items-center justify-center border-2 border-black bg-[#fffdf8]">
                                <ArrowDownRight size={25} strokeWidth={2.5} />
                            </span>

                            <span className="pt-1 text-xs font-black uppercase tracking-[0.2em]">
                                Sign in / 01
                            </span>
                        </div>

                        <h1 className="text-4xl font-black leading-[0.88] tracking-[-0.075em] sm:text-5xl">
                            GOOD
                            <br />
                            TO HAVE
                            <br />
                            YOU BACK<span className="text-[#fffdf8]">.</span>
                        </h1>

                        <p className="mt-5 max-w-67.5 text-sm font-medium leading-6">
                            Your space for bigger thoughts starts here.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
                        <div className="space-y-2">
                            <Label
                                htmlFor="email"
                                className="text-xs font-black uppercase tracking-[0.16em]"
                            >
                                Email address
                            </Label>

                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="Enter your Email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                                maxLength={254}
                                className="h-12 rounded-none border-2 border-black bg-[#faf9f6] px-4 text-base shadow-none placeholder:text-neutral-400 focus-visible:border-black focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label
                                    htmlFor="password"
                                    className="text-xs font-black uppercase tracking-[0.16em]"
                                >
                                    Password
                                </Label>

                                <Link
                                    href="/forgot-password"
                                    className="text-xs font-bold underline decoration-2 underline-offset-4 transition-colors hover:text-lime-700"
                                >
                                    Forgot?
                                </Link>
                            </div>

                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                                maxLength={128}
                                className="h-12 rounded-none border-2 border-black bg-[#faf9f6] px-4 text-base shadow-none placeholder:text-neutral-400 focus-visible:border-black focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2"
                            />
                        </div>

                        {error && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="border-2 border-red-700 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
                            >
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="group h-14 w-full rounded-none border-2 border-black bg-black text-sm font-black uppercase tracking-[0.16em] text-white shadow-[4px_4px_0_0_#a3e635] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-black hover:shadow-[2px_2px_0_0_#a3e635] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing you in...
                                </>
                            ) : (
                                <>
                                    Enter NexGPT
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </Button>

                        <div className="relative flex items-center gap-3 py-1">
                            <div className="h-0.5 flex-1 bg-black/15" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                                Or continue with
                            </span>
                            <div className="h-0.5 flex-1 bg-black/15" />
                        </div>

                        <GoogleSignInButton intent="login" />

                        <div className="flex items-center gap-3 py-1">
                            <div className="h-0.5 flex-1 bg-black/15" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                                New around here?
                            </span>
                            <div className="h-0.5 flex-1 bg-black/15" />
                        </div>

                        <Link
                            href="/register"
                            className="flex h-12 w-full items-center justify-center border-2 border-black bg-transparent text-xs font-black uppercase tracking-[0.16em] transition-colors hover:bg-lime-200"
                        >
                            Create an account
                        </Link>
                    </form>

                    <div className="flex items-center justify-between border-t-2 border-black px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 sm:px-8">
                        <span>Private by design.</span>
                        <span>© NexGPT 2026</span>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs font-medium text-neutral-500">
                    By continuing, you agree to use NexGPT responsibly.
                </p>
            </section>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <main className="flex min-h-screen items-center justify-center bg-[#f4f0e8]">
                    <p className="text-sm font-semibold">Loading login...</p>
                </main>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
