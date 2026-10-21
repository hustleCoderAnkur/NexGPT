"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownRight, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";

const OIDC_ERRORS: Record<string, string> = {
    google_signin_failed: "Google sign-in failed. Please try again.",
    google_email_not_verified: "Please verify your Google email before continuing.",
    google_account_exists:
        "This Google account is already registered. Please sign in instead.",
    google_account_not_registered:
        "This Google account is not registered yet. Please use Google registration first.",
    account_link_required:
        "An account with this email already exists. Sign in with your password first. Accounts are not automatically linked.",
    invalid_google_flow: "Your sign-in session expired. Please try again.",
};

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(
        OIDC_ERRORS[searchParams.get("error") ?? ""] ?? ""
    );
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        if (password.length < 12) {
            setError("Password must contain at least 12 characters.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error ?? "Registration failed. Please try again.");
                return;
            }
            router.replace("/");
        } catch {
            setError("Unable to connect to the server. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f2ec] px-5 py-10 text-black selection:bg-lime-300 selection:text-black">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{
                    backgroundImage:
                        "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />

            <div className="relative z-10 w-full max-w-120">
                <header className="mb-8 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center border-2 border-black bg-lime-300 shadow-[3px_3px_0_#000]">
                            <ArrowDownRight size={25} strokeWidth={3} />
                        </span>
                        <span className="text-xl font-black tracking-[-0.07em]">
                            NEXGPT<span className="text-lime-600">.</span>
                        </span>
                    </Link>

                    <span className="border-2 border-black px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]">
                        New account
                    </span>
                </header>

                <section className="border-2 border-black bg-white shadow-[8px_8px_0_#000] sm:shadow-[12px_12px_0_#000]">
                    <div className="border-b-2 border-black bg-lime-300 px-6 py-5 sm:px-8">
                        <div className="mb-5 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-[0.18em]">
                                Account setup
                            </span>
                            <span className="size-3 border-2 border-black bg-white" />
                        </div>

                        <h1 className="text-4xl font-black leading-[0.95] tracking-[-0.07em] sm:text-5xl">
                            MAKE
                            <br />
                            YOURSELF
                            <br />
                            AT HOME<span className="text-white">.</span>
                        </h1>

                        <p className="mt-5 max-w-xs text-sm font-medium leading-6">
                            One account. Your workspace. Start building something
                            interesting.
                        </p>
                    </div>

                    <div className="p-6 sm:p-8">
                        <div className="mb-7">
                            <h2 className="text-xl font-black tracking-tight">
                                Create account
                            </h2>
                            <p className="mt-1 text-sm text-neutral-500">
                                Choose how you want to get started.
                            </p>
                        </div>

                        {error && (
                            <Alert
                                variant="destructive"
                                className="mb-5 rounded-none border-2 border-black"
                            >
                                <AlertTitle className="font-black">
                                    Registration issue
                                </AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="name"
                                    className="text-xs font-bold uppercase tracking-[0.13em]"
                                >
                                    01 - Full name
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    autoComplete="name"
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    minLength={2}
                                    maxLength={100}
                                    required
                                    disabled={loading}
                                    className="h-12 rounded-none border-2 border-black bg-[#faf9f6] px-4 text-base shadow-none placeholder:text-neutral-400 focus-visible:border-black focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="email"
                                    className="text-xs font-bold uppercase tracking-[0.13em]"
                                >
                                    02 - Email address
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    maxLength={254}
                                    required
                                    disabled={loading}
                                    className="h-12 rounded-none border-2 border-black bg-[#faf9f6] px-4 text-base shadow-none placeholder:text-neutral-400 focus-visible:border-black focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="password"
                                    className="text-xs font-bold uppercase tracking-[0.13em]"
                                >
                                    03 - Password
                                </Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Minimum 12 characters"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    minLength={12}
                                    maxLength={128}
                                    required
                                    disabled={loading}
                                    className="h-12 rounded-none border-2 border-black bg-[#faf9f6] px-4 text-base shadow-none placeholder:text-neutral-400 focus-visible:border-black focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2"
                                />
                                <p className="text-xs leading-5 text-neutral-500">
                                    Use a unique password you do not use elsewhere.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="group mt-3 h-14 w-full justify-between rounded-none border-2 border-black bg-black px-5 text-base font-bold text-white shadow-[4px_4px_0_#a3e635] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-neutral-800 hover:shadow-[2px_2px_0_#a3e635] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                <span>
                                    {loading ? "Creating your account..." : "Create my account"}
                                </span>
                                {loading ? (
                                    <Loader2 className="size-5 animate-spin" />
                                ) : (
                                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                                )}
                            </Button>
                        </form>

                        <div className="my-7 flex items-center gap-3">
                            <div className="h-px flex-1 bg-neutral-200" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                                Or sign up with
                            </span>
                            <div className="h-px flex-1 bg-neutral-200" />
                        </div>

                        <GoogleSignInButton intent="register" />

                        <div className="my-7 flex items-center gap-3">
                            <div className="h-px flex-1 bg-neutral-200" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                                Already a member?
                            </span>
                            <div className="h-px flex-1 bg-neutral-200" />
                        </div>

                        <Link
                            href="/login"
                            className="group flex min-h-12 items-center justify-between border-2 border-black px-4 text-sm font-bold transition-colors hover:bg-lime-300"
                        >
                            Sign in to your account
                            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </section>

                <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">
                    <span>Built to think differently.</span>
                    <span className="flex items-center gap-2">
                        <span className="size-2 bg-lime-500" />
                        Your next chapter starts here
                    </span>
                </footer>
            </div>
        </main>
    );
}

export default function RegisterPage() {
    return (
        <Suspense
            fallback={
                <main className="flex min-h-screen items-center justify-center bg-[#f4f2ec] p-6 text-black">
                    <p className="text-sm font-semibold">
                        Loading registration...
                    </p>
                </main>
            }
        >
            <RegisterForm />
        </Suspense>
    );
}
