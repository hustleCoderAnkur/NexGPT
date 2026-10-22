"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import {
    ArrowDownRight,
    ArrowRight,
    Asterisk,
    Check,
    FileText,
    GitCompare,
    Layers,
    Menu,
    Plus,
    Send,
    ShieldCheck,
    Sparkles,
    Zap,
} from "lucide-react";
import { Claude, Gemini, OpenAI } from "@lobehub/icons";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-grotesk" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

/* ------------------------------------------------------------------ */
/* Model marks (LobeHub icons)                                         */
/* ------------------------------------------------------------------ */
const MODELS = {
    openai: { label: "OpenAI", Logo: OpenAI },
    gemini: { label: "Google Gemini", Logo: Gemini },
    claude: { label: "Anthropic Claude", Logo: Claude },
} as const;

function ModelMark({ kind, size = 18 }: { kind: keyof typeof MODELS; size?: number }) {
    const { label, Logo } = MODELS[kind];
    return (
        <span className={`model-mark mm-${kind}`} role="img" aria-label={label}>
            <Logo size={size} />
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Reveal on scroll                                                    */
/* ------------------------------------------------------------------ */
function Reveal({
    children,
    className = "",
    delay = 0,
    from = "up",
}: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    from?: "up" | "left" | "right" | "pop";
}) {
    return (
        <div className={`reveal reveal-${from} ${className}`} style={{ ["--d" as string]: `${delay}ms` }}>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Box loader (Uiverse by InfinityLoopGames) -> React                  */
/* Keyframes are generated so the 8 boxes don't need 16 hand-written    */
/* blocks. Change --primary / --primary-light below to recolour it.    */
/* ------------------------------------------------------------------ */
const BOXES = [
    { x: -220, y: -120, l: 58, t: 108 },
    { x: -260, y: 120, l: 25, t: 120 },
    { x: 120, y: -190, l: 58, t: 64 },
    { x: 280, y: -40, l: 91, t: 120 },
    { x: 60, y: 200, l: 58, t: 132 },
    { x: -220, y: -120, l: 25, t: 76 },
    { x: -260, y: 120, l: 91, t: 76 },
    { x: -240, y: 200, l: 58, t: 87 },
];
const POSE = "rotateY(-47deg) rotateX(-15deg) rotateZ(15deg)";
const GROUND = "rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px)";

const LOADER_CSS =
    `
.nx-loader{--duration:3s;--primary:#ff5b1f;--primary-light:#ff8a4d;--primary-rgba:rgba(255,91,31,0);width:200px;height:320px;position:relative;transform-style:preserve-3d;}
@media (max-width:480px){.nx-loader{zoom:.5;}}
.nx-loader:before,.nx-loader:after{--r:20.5deg;content:"";width:320px;height:140px;position:absolute;right:32%;bottom:-11px;background:var(--loader-bg,#f3efe3);transform:translateZ(200px) rotate(var(--r));animation:nx-mask var(--duration) linear forwards infinite;}
.nx-loader:after{--r:-20.5deg;right:auto;left:32%;}
.nx-loader .ground{position:absolute;left:-50px;bottom:-120px;transform-style:preserve-3d;transform:rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1);}
.nx-loader .ground div{transform:${GROUND} scale(0);width:200px;height:200px;background:linear-gradient(45deg,var(--primary) 0%,var(--primary) 50%,var(--primary-light) 50%,var(--primary-light) 100%);transform-style:preserve-3d;animation:nx-ground var(--duration) linear forwards infinite;}
.nx-loader .ground div:before,.nx-loader .ground div:after{--rx:90deg;--ry:0deg;--x:44px;--y:162px;--z:-50px;content:"";width:156px;height:300px;opacity:0;background:linear-gradient(var(--primary),var(--primary-rgba));position:absolute;transform:rotateX(var(--rx)) rotateY(var(--ry)) translate(var(--x),var(--y)) translateZ(var(--z));animation:nx-shine var(--duration) linear forwards infinite;}
.nx-loader .ground div:after{--rx:90deg;--ry:90deg;--x:0;--y:177px;--z:150px;}
.nx-loader .box{--x:0;--y:0;position:absolute;animation:var(--duration) linear forwards infinite;transform:translate(var(--x),var(--y));}
.nx-loader .box div{background-color:var(--primary);width:48px;height:48px;position:relative;transform-style:preserve-3d;animation:var(--duration) ease forwards infinite;transform:${POSE} scale(0);}
.nx-loader .box div:before,.nx-loader .box div:after{--rx:90deg;--ry:0deg;--z:24px;--y:-24px;--x:0;content:"";position:absolute;background-color:inherit;width:inherit;height:inherit;transform:rotateX(var(--rx)) rotateY(var(--ry)) translate(var(--x),var(--y)) translateZ(var(--z));filter:brightness(var(--b,1.2));}
.nx-loader .box div:after{--rx:0deg;--ry:90deg;--x:24px;--y:0;--b:1.4;}
@keyframes nx-ground{0%,65%{transform:${GROUND} scale(0);}75%,90%{transform:${GROUND} scale(1);}100%{transform:${GROUND} scale(0);}}
@keyframes nx-shine{0%,70%{opacity:0;}75%,87%{opacity:.2;}100%{opacity:0;}}
@keyframes nx-mask{0%,65%{opacity:0;}66%,100%{opacity:1;}}
` +
    BOXES.map(
        (b, i) =>
            `.nx-loader .box.box${i}{--x:${b.x}px;--y:${b.y}px;left:${b.l}px;top:${b.t}px;animation-name:nx-move${i};}` +
            `.nx-loader .box.box${i} div{animation-name:nx-scale${i};}` +
            `@keyframes nx-move${i}{${12 + 4 * i}%{transform:translate(var(--x),var(--y));}${25 + 4 * i}%,52%{transform:translate(0,0);}80%{transform:translate(0,-32px);}90%,100%{transform:translate(0,188px);}}` +
            `@keyframes nx-scale${i}{${6 + 4 * i}%{transform:${POSE} scale(0);}${14 + 4 * i}%,100%{transform:${POSE} scale(1);}}`,
    ).join("");

function BoxLoader() {
    return (
        <>
            <style>{LOADER_CSS}</style>
            <div className="nx-loader" aria-hidden="true">
                <div className="ground"><div /></div>
                {BOXES.map((_, i) => (
                    <div key={i} className={`box box${i}`}><div /></div>
                ))}
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Marquee                                                             */
/* ------------------------------------------------------------------ */
function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
    const row = (key: string) => (
        <span key={key} className="marquee-set" aria-hidden={key === "b"}>
            {items.map((t) => (
                <span key={t} className="marquee-item">{t} <Asterisk size={22} strokeWidth={3} /></span>
            ))}
        </span>
    );
    return (
        <div className={`marquee ${className}`}>
            <div className="marquee-track">{row("a")}{row("b")}</div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function ProductPage() {
    const rootRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        // reveal on scroll
        const nodes = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -35px 0px" },
        );
        nodes.forEach((node) => observer.observe(node));

        // scroll progress bar
        let raf = 0;
        const onScroll = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const max = document.documentElement.scrollHeight - window.innerHeight;
                root.style.setProperty("--progress", String(max > 0 ? window.scrollY / max : 0));
            });
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });

        // hero pointer parallax for the floating shapes
        const hero = root.querySelector<HTMLElement>(".hero");
        const onMove = (e: PointerEvent) => {
            if (!hero) return;
            const r = hero.getBoundingClientRect();
            hero.style.setProperty("--mx", String(((e.clientX - r.left) / r.width - 0.5) * 2));
            hero.style.setProperty("--my", String(((e.clientY - r.top) / r.height - 0.5) * 2));
        };
        hero?.addEventListener("pointermove", onMove);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(raf);
            window.removeEventListener("scroll", onScroll);
            hero?.removeEventListener("pointermove", onMove);
        };
    }, []);

    return (
        <main ref={rootRef} className={`nex-product ${grotesk.variable} ${mono.variable}`}>
            <div className="scroll-progress" aria-hidden="true" />

            <div className="announcement">
                <span className="announcement-dot" />
                One workspace. Multiple perspectives.
                <Link href="/signup" className="announcement-link">Meet NexGPT <ArrowRight size={16} /></Link>
            </div>

            <header className="site-nav">
                <Link href="/" className="brand" aria-label="NexGPT home">
                    <span className="brand-symbol"><Sparkles size={22} /></span>
                    <span>Nex<span className="brand-accent">GPT</span></span>
                </Link>
                <nav className="desktop-nav" aria-label="Main navigation">
                    <a href="#product">Product</a>
                    <a href="#capabilities">Capabilities</a>
                    <a href="#workflow">How it works</a>
                </nav>
                <div className="nav-actions">
                    <Link href="/login" className="nav-signin">Sign in</Link>
                    <Button className="nb-btn nb-dark nb-small">
                        <Link href="/signup">Get started <ArrowRight size={16} /></Link>
                    </Button>
                </div>
                <a href="#product" className="mobile-menu" aria-label="Jump to product"><Menu size={22} /></a>
            </header>

            {/* ============================ HERO ============================ */}
            <section className="hero" id="product">
                <div className="hero-shapes" aria-hidden="true">
                    <i className="sh sh-1" style={{ ["--k" as string]: "26px" }} />
                    <i className="sh sh-2" style={{ ["--k" as string]: "-18px" }} />
                    <i className="sh sh-3" style={{ ["--k" as string]: "14px" }} />
                    <i className="sh sh-4" style={{ ["--k" as string]: "-30px" }} />
                    <span className="sh sh-5" style={{ ["--k" as string]: "22px" }}><Plus size={54} strokeWidth={4} /></span>
                </div>

                <div className="hero-top">
                    <Reveal className="hero-copy">
                        <Badge className="nb-badge"><Sparkles size={16} /> YOUR AI WORKSPACE, REIMAGINED</Badge>
                        <h1>
                            Good answers are great.<br />
                            <span className="hl">Better perspectives</span> are everything.
                        </h1>
                        <p className="hero-description">
                            Bring your AI models, conversations, and documents into one focused workspace. Ask once, explore different perspectives, and keep the context that matters.
                        </p>
                        <div className="hero-actions">
                            <Button className="nb-btn nb-dark">
                                <Link href="/signup">Start exploring <ArrowRight size={24} /></Link>
                            </Button>
                            <Button className="nb-btn nb-light">
                                <a href="#workflow">See how it works <ArrowDownRight size={24} /></a>
                            </Button>
                        </div>
                        <div className="mini-row">
                            <div className="mini"><Zap size={18} /> Ask once</div>
                            <div className="mini"><GitCompare size={18} /> Compare side by side</div>
                            <div className="mini"><ShieldCheck size={18} /> Context stays put</div>
                        </div>
                        <div className="hero-proof">
                            <span className="proof-avatars">
                                <Avatar className="proof-av av-1 h-14! w-14!">
                                    <AvatarFallback>
                                        <OpenAI size={34} />
                                    </AvatarFallback>
                                </Avatar>

                                <Avatar className="proof-av av-2 h-14! w-14!">
                                    <AvatarFallback>
                                        <Gemini size={34} />
                                    </AvatarFallback>
                                </Avatar>

                                <Avatar className="proof-av av-3 h-14! w-14!">
                                    <AvatarFallback>
                                        <Claude size={34} />
                                    </AvatarFallback>
                                </Avatar>
                            </span>
                            <span>One workspace for the models you already use.</span>
                        </div>
                    </Reveal>

                    {/* Loader lives in the hero */}
                    <Reveal className="hero-loader-wrap" from="right" delay={150}>
                        <div className="seal" aria-hidden="true"><Asterisk size={40} strokeWidth={3} /></div>
                        <div className="float-chip chip-top"><span className="chip-pulse" /> Multiple perspectives</div>
                        <div className="loader-card">
                            <div className="loader-top">
                                <div className="window-dots"><i /><i /></div>
                                <span>THINKING.INIT</span>
                                <b className="live"><span className="live-dot" />LIVE</b>
                            </div>
                            <div className="loader-stage"><BoxLoader /></div>
                            <div className="loader-foot"><Loader size={18} /> Packing 3 perspectives into one answer…</div>
                        </div>
                        <div className="float-chip chip-bottom"><ShieldCheck size={18} /> Your context stays organized</div>
                    </Reveal>
                </div>

                <Reveal className="hero-stage" from="pop" delay={100}>
                    <div className="product-window">
                        <div className="window-topbar">
                            <div className="window-dots"><i /><i /><i /></div>
                            <div className="window-title">NexGPT <span>/</span> New conversation</div>
                            <div className="window-top-icon"><Plus size={16} strokeWidth={3} /></div>
                        </div>
                        <div className="mock-workspace">
                            <aside className="mock-sidebar">
                                <div className="mock-brand"><span className="mini-brand"><Sparkles size={14} /></span><b>NexGPT</b></div>
                                <div className="mock-new mini"><Plus size={14} strokeWidth={3} /> New chat</div>
                                <small>RECENT</small>
                                <div className="mock-side-row mini active"><span /> Compare frameworks</div>
                                <div className="mock-side-row mini"><span /> Research notes</div>
                                <div className="mock-side-row mini"><span /> Product strategy</div>
                                <div className="mock-side-row mini"><span /> Untitled conversation</div>
                                <div className="mock-side-bottom"><div className="mock-avatar">N</div><span>Workspace</span><span className="mock-ellipsis">···</span></div>
                            </aside>
                            <div className="mock-chat">
                                <div className="mock-chat-heading">
                                    <div><strong>Compare frameworks</strong><small>Explore answers side by side</small></div>
                                    <span className="mock-pill"><span /> 3 models</span>
                                </div>
                                <Message from="user" className="mock-msg">
                                    <MessageContent className="mock-bubble">What should I consider when choosing a tech stack?</MessageContent>
                                </Message>
                                <div className="mock-model-grid">
                                    <div className="mock-answer">
                                        <div className="mock-answer-head"><ModelMark kind="openai" /><div><b>OpenAI</b><small>Response</small></div><span className="answer-dot" /></div>
                                        <p>Start with your team&apos;s skills, then weigh ecosystem maturity and hiring.</p>
                                        <Badge className="answer-tag tag-lime">Architecture</Badge>
                                    </div>
                                    <div className="mock-answer">
                                        <div className="mock-answer-head"><ModelMark kind="gemini" /><div><b>Gemini</b><small>Response</small></div><span className="answer-dot" /></div>
                                        <p>Prototype two options quickly. Compare cost, speed, and risk side by side.</p>
                                        <Badge className="answer-tag tag-yellow">Trade-offs</Badge>
                                    </div>
                                    <div className="mock-answer">
                                        <div className="mock-answer-head"><ModelMark kind="claude" /><div><b>Claude</b><small>Response</small></div><span className="answer-dot" /></div>
                                        <p>Pick what you can maintain in two years, not just what ships this week.</p>
                                        <Badge className="answer-tag tag-sky">Long-term fit</Badge>
                                    </div>
                                </div>
                                <Suggestions className="mock-suggest">
                                    <Suggestion suggestion="Compare costs" className="nb-suggest" />
                                    <Suggestion suggestion="Summarize differences" className="nb-suggest" />
                                    <Suggestion suggestion="Pick one for me" className="nb-suggest" />
                                </Suggestions>
                                <div className="mock-composer">
                                    <span className="typing">Ask a follow-up...</span>
                                    <span className="mock-send"><Send size={16} /></span>
                                </div>
                                <div className="mock-caption">Illustrative product preview · provider availability depends on your setup</div>
                            </div>
                        </div>
                    </div>
                </Reveal>

                <div className="hero-bottom-note"><span>BUILT FOR CURIOUS MINDS</span><span className="note-line" /><span>THINK WIDER. WORK CLEARER.</span></div>
            </section>

            <Marquee items={["Ask once", "Compare models", "Keep context", "Think wider", "Work clearer", "One workspace"]} />

            {/* =========================== MANIFESTO ========================= */}
            <section className="manifesto section-pad">
                <Reveal from="left">
                    <p className="section-kicker">ONE QUESTION. MORE ANGLES.</p>
                    <h2>Stop switching tabs.<br /><span className="hl hl-white">Start connecting ideas.</span></h2>
                    <p className="manifesto-copy">Your thinking should not be scattered across tools. NexGPT brings supported AI providers and your working context into one calm, organized place.</p>
                </Reveal>
                <Reveal className="manifesto-art-wrap" from="right" delay={120}>
                    <div className="manifesto-art">
                        <div className="art-sq sq-one" /><div className="art-sq sq-two" /><div className="art-sq sq-three" />
                        <div className="art-core"><Sparkles size={46} /></div>
                        <div className="art-orb orb-orange"><OpenAI size={28} /></div>
                        <div className="art-orb orb-yellow"><Gemini size={24} /></div>
                        <div className="art-orb orb-sky"><Claude size={30} /></div>
                        <span className="art-label art-label-left">ASK</span><span className="art-label art-label-right">EXPLORE</span><span className="art-label art-label-bottom">UNDERSTAND</span>
                    </div>
                </Reveal>
            </section>

            {/* =========================== CAPABILITIES ====================== */}
            <section className="capabilities section-pad" id="capabilities">
                <Reveal className="section-heading">
                    <p className="section-kicker">A BETTER WAY TO WORK WITH AI</p>
                    <h2>Less tool-hopping.<br /><span className="hl">More forward motion.</span></h2>
                    <p>Everything is designed to keep your attention on the problem, not the plumbing.</p>
                </Reveal>
                <div className="feature-grid">
                    <Reveal className="feature-wide" delay={0}>
                        <Card className="nb-card feature-card c-lime">
                            <span className="card-tab">01 / MULTI-MODEL</span>
                            <div className="feature-card-copy">
                                <span className="feature-icon"><GitCompare size={26} /></span>
                                <h3>Different minds.<br />One conversation.</h3>
                                <p>Compare independent responses from the providers you choose, without losing your place or your question.</p>
                            </div>
                            <div className="feature-art model-stack">
                                <div className="stack-card mini stack-back"><ModelMark kind="claude" size={20} /><span>Nuance &amp; reasoning</span></div>
                                <div className="stack-card mini stack-mid"><ModelMark kind="gemini" size={20} /><span>Ideas &amp; exploration</span></div>
                                <div className="stack-card mini stack-front"><ModelMark kind="openai" size={20} /><span>Structure &amp; clarity</span><Check size={20} strokeWidth={3} /></div>
                            </div>
                        </Card>
                    </Reveal>
                    <Reveal delay={100}>
                        <Card className="nb-card feature-card c-yellow">
                            <span className="card-tab">02 / DOCUMENT CONTEXT</span>
                            <div className="feature-card-copy">
                                <span className="feature-icon"><FileText size={26} /></span>
                                <h3>Bring your own context.</h3>
                                <p>Work with supported documents and <br /> inspect the sources returned <br /> by your retrieval workflow.</p>
                            </div>
                            <div className="doc-art">
                                <div className="doc-sheet sheet-back"><span /><span /><span /></div>
                                <div className="doc-sheet sheet-front">
                                    <div className="doc-sheet-icon"><FileText size={20} /></div>
                                    <b>Your notes</b><span /><span /><span className="doc-line-short" />
                                    <div className="doc-highlight">Relevant context</div>
                                    <i className="scan-line" />
                                </div>
                                <div className="doc-spark"><Sparkles size={20} /></div>
                            </div>
                        </Card>
                    </Reveal>
                    <Reveal delay={200}>
                        <Card className="nb-card feature-card c-sky">
                            <span className="card-tab">03 / CONTINUITY</span>
                            <div className="feature-card-copy">
                                <span className="feature-icon"><Layers size={26} /></span>
                                <h3>Your work, in context.</h3>
                                <p>Return to saved conversations and continue from where your work actually left off.</p>
                            </div>
                            <div className="history-art">
                                <div className="history-row mini hr-1"><span className="history-bullet" /><div><b>Product direction</b><i /></div><Sparkles className="history-star" size={18} /></div>
                                <div className="history-row mini hr-2"><span className="history-bullet" /><div><b>Research synthesis</b><i /></div></div>
                                <div className="history-row mini hr-3"><span className="history-bullet" /><div><b>System design notes</b><i /></div></div>
                            </div>
                        </Card>
                    </Reveal>
                </div>
            </section>

            <Marquee className="marquee-yellow marquee-reverse" items={["Less tool-hopping", "More forward motion", "Ask naturally", "Compare and continue"]} />

            {/* ============================ WORKFLOW ========================= */}
            <section className="workflow section-pad" id="workflow">
                <Reveal className="workflow-intro" from="left">
                    <p className="section-kicker">A SIMPLE, FOCUSED FLOW</p>
                    <h2>From question<br />to <span className="hl hl-white">clearer thinking.</span></h2>
                    <p>No complicated setup to understand the workflow. Start with a question, choose your available models, and explore the responses.</p>
                    <Link href="/signup" className="text-link">Try NexGPT <ArrowRight size={18} /></Link>
                </Reveal>
                <div className="workflow-steps">
                    <Reveal delay={0} from="right">
                        <Card className="nb-card workflow-step">
                            <div className="step-number">01</div>
                            <div className="step-visual step-question"><span className="step-bubble">How should I approach this?</span><span className="step-cursor" /></div>
                            <div><h3>Ask naturally</h3><p>Start with the question, idea, or problem you are working through.</p></div>
                        </Card>
                    </Reveal>
                    <Reveal delay={120} from="right">
                        <Card className="nb-card workflow-step">
                            <div className="step-number">02</div>
                            <div className="step-visual step-select">
                                <span className="step-model mini"><ModelMark kind="openai" /> OpenAI <Check size={16} strokeWidth={3} /></span>
                                <span className="step-model mini"><ModelMark kind="gemini" /> Gemini <Check size={16} strokeWidth={3} /></span>
                                <span className="step-model mini muted-model"><ModelMark kind="claude" /> Claude</span>
                            </div>
                            <div><h3>Choose your perspective</h3><p>Select from the providers and models available in your current setup.</p></div>
                        </Card>
                    </Reveal>
                    <Reveal delay={240} from="right">
                        <Card className="nb-card workflow-step">
                            <div className="step-number">03</div>
                            <div className="step-visual step-answers">
                                <span className="answer-mini answer-mini-one"><i /><i /><i /></span>
                                <span className="answer-mini answer-mini-two"><i /><i /><i /></span>
                                <span className="answer-mini answer-mini-three"><i /><i /><i /></span>
                                <span className="answer-mini-check"><Check size={18} strokeWidth={3} /></span>
                            </div>
                            <div><h3>Compare and continue</h3><p>Explore responses, keep useful context, and ask the next question.</p></div>
                        </Card>
                    </Reveal>
                </div>
            </section>

            {/* ============================ STATEMENT ======================== */}
            <section className="statement-section">
                <div className="hazard hazard-top" aria-hidden="true" />
                <div className="statement-noise" />
                <div className="outline-word" aria-hidden="true">ASK · COMPARE · DECIDE · ASK · COMPARE · DECIDE ·</div>
                <Reveal from="pop">
                    <p className="section-kicker">YOUR THINKING SPACE</p>
                    <h2>More than one answer.<br /><span>More room to think.</span></h2>
                    <p>Use AI as a space to explore, compare, and refine — while keeping your conversations organized.</p>
                    <Button className="nb-btn nb-white">
                        <Link href="/signup">Make space for better ideas </Link>
                    </Button>
                </Reveal>
                <div className="hazard hazard-bottom" aria-hidden="true" />
            </section>

            {/* ============================== FAQ ============================ */}
            <section className="faq-section section-pad">
                <Reveal className="faq-intro" from="left">
                    <p className="section-kicker">GOOD QUESTIONS</p>
                    <h2>A few things<br /><span className="hl">you might wonder.</span></h2>
                    <p>Clear answers about what NexGPT is designed to do.</p>
                </Reveal>
                <Reveal className="faq-list" from="right" delay={100}>
                    <Accordion defaultValue={["q1"]}>
                        <AccordionItem value="q1" className="faq-item">
                            <AccordionTrigger className="faq-trigger">What is NexGPT?</AccordionTrigger>
                            <AccordionContent className="faq-content">NexGPT is a workspace for interacting with supported AI providers, organizing conversations, and working with document context where those features are enabled.</AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="q2" className="faq-item">
                            <AccordionTrigger className="faq-trigger">Can I compare multiple AI providers?</AccordionTrigger>
                            <AccordionContent className="faq-content">The workspace supports multi-provider selection where configured. Available providers and models depend on the integrations and credentials enabled in your application.</AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="q3" className="faq-item">
                            <AccordionTrigger className="faq-trigger">Can I ask questions about my documents?</AccordionTrigger>
                            <AccordionContent className="faq-content">Where document upload and retrieval are enabled, NexGPT can use retrieved context and show the sources returned by the backend.</AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="q4" className="faq-item">
                            <AccordionTrigger className="faq-trigger">Do I need an account?</AccordionTrigger>
                            <AccordionContent className="faq-content">Browsing this product page does not require an account. Sign in or create an account to use the authenticated workspace, according to your applications access rules.</AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Reveal>
            </section>

            {/* ============================ FINAL CTA ======================== */}
            <section className="final-cta">
                <Reveal from="pop">
                    <div className="cta-symbol"><Sparkles size={30} /></div>
                    <p className="section-kicker">READY WHEN YOU ARE</p>
                    <h2>Bring your questions.<br /><span className="hl hl-white">Find your perspective.</span></h2>
                    <p>One focused space for the way you think and work with AI.</p>
                    <Button className="nb-btn nb-white">
                        <Link href="/signup">Get started with NexGPT</Link>
                    </Button>
                    <span className="cta-note">Create an account to enter your workspace.</span>
                </Reveal>
            </section>

            <footer className="site-footer">
                <div className="footer-main">
                    <Link href="/" className="brand"><span className="brand-symbol"><Sparkles size={20} /></span><span>Nex<span className="brand-accent">GPT</span></span></Link>
                    <p>A little more perspective goes a long way.</p>
                    <div className="footer-links"><a href="#product">Product</a><a href="#capabilities">Capabilities</a><a href="#workflow">How it works</a><Link href="/login">Sign in</Link></div>
                </div>
                <Separator className="footer-sep" />
                <div className="footer-bottom"><span>&copy; 2026 NexGPT</span><span>Made for curious minds.</span><a href="#product">Back to top ↑</a></div>
            </footer>

            <style jsx global>{`
        .nex-product { --ink:#0d0d0d; --paper:#f3efe3; --paper2:#e8e2cf; --lime:#c8ff2e; --orange:#ff5b1f; --yellow:#ffd60a; --sky:#6fdcff; --loader-bg:#f3efe3; --progress:0; --mx:0; --my:0; }
        * { box-sizing:border-box; }
        html { scroll-behavior:smooth; }
        body { margin:0; }
        .nex-product { position:relative; color:var(--ink); background-color:var(--paper); overflow:hidden; font-family:var(--font-grotesk),system-ui,sans-serif; font-size:17px; letter-spacing:-.01em; }
        .nex-product::before { content:""; position:absolute; inset:0; z-index:0; pointer-events:none; background-image:linear-gradient(rgba(13,13,13,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(13,13,13,.08) 1px,transparent 1px); background-size:48px 48px; animation:grid-pan 40s linear infinite; }
        @keyframes grid-pan { to { background-position:48px 48px; } }
        .nex-product > * { position:relative; z-index:1; }
        .nex-product a { color:inherit; text-decoration:none; }
        .nex-product :focus-visible { outline:3px dashed var(--ink); outline-offset:3px; }
        .scroll-progress { position:fixed!important; top:0; left:0; right:0; height:6px; z-index:100!important; background:var(--orange); border-bottom:2px solid var(--ink); transform-origin:left; transform:scaleX(var(--progress)); }

        /* ---------- announcement + nav ---------- */
        .announcement { min-height:44px; display:flex; align-items:center; justify-content:center; gap:12px; padding:10px 16px; background:var(--ink); color:var(--lime); font-family:var(--font-mono),monospace; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .announcement-dot,.chip-pulse,.live-dot { width:10px; height:10px; background:var(--orange); border:2px solid currentColor; animation:blink 1s steps(2) infinite; }
        @keyframes blink { 50% { opacity:.2; } }
        .announcement-link { display:inline-flex; align-items:center; gap:6px; margin-left:6px; padding:2px 8px; background:var(--lime); color:var(--ink)!important; transition:transform .2s ease,background .2s ease; }
        .announcement-link:hover { transform:translateX(4px) rotate(-2deg); background:var(--yellow); }
        .site-nav { height:88px; max-width:1360px; margin:auto; padding:0 34px; display:flex; align-items:center; justify-content:space-between; }
        .brand { display:inline-flex; align-items:center; gap:12px; font-size:28px; font-weight:700; letter-spacing:-.06em; }
        .brand-symbol { width:44px; height:44px; display:grid; place-items:center; background:var(--ink); color:var(--lime); border:3px solid var(--ink); box-shadow:4px 4px 0 var(--orange); transition:transform .35s cubic-bezier(.3,1.6,.5,1),box-shadow .2s; }
        .brand:hover .brand-symbol { transform:rotate(90deg) scale(1.08); box-shadow:2px 2px 0 var(--orange); }
        .brand-accent { background:var(--lime); padding:0 4px; margin-left:2px; border:2px solid var(--ink); }
        .desktop-nav { display:flex; align-items:center; gap:36px; font-size:17px; font-weight:700; }
        .desktop-nav a,.footer-links a { position:relative; transition:transform .2s ease; }
        .desktop-nav a::after,.footer-links a::after { content:""; position:absolute; left:-4px; right:-4px; bottom:-4px; height:10px; background:var(--lime); z-index:-1; transform:scaleX(0); transform-origin:left; transition:transform .28s cubic-bezier(.2,.8,.2,1); }
        .desktop-nav a:hover,.footer-links a:hover { transform:translateY(-2px); }
        .desktop-nav a:hover::after,.footer-links a:hover::after { transform:scaleX(1); }
        .nav-actions { display:flex; align-items:center; gap:24px; font-size:16px; font-weight:700; }
        .nav-signin { text-decoration:underline!important; text-decoration-thickness:3px!important; text-underline-offset:5px; transition:color .2s; }
        .nav-signin:hover { color:var(--orange)!important; }
        .mobile-menu { display:none; }

        /* ---------- brutalist buttons (shadcn Button) ---------- */
        .nex-product .nb-btn { height:auto; min-height:60px; padding:0 28px; display:inline-flex; align-items:center; justify-content:center; gap:12px; position:relative; overflow:hidden; isolation:isolate; border:3px solid var(--ink); border-radius:0; font-family:var(--font-mono),monospace; font-size:16px; font-weight:700; letter-spacing:.02em; text-transform:uppercase; box-shadow:6px 6px 0 var(--ink); transition:transform .18s ease,box-shadow .18s ease,color .2s ease; cursor:pointer; }
        .nex-product .nb-btn::before { content:""; position:absolute; inset:0; z-index:-1; background:var(--wipe,var(--lime)); transform:translateY(101%); transition:transform .32s cubic-bezier(.2,.8,.2,1); }
        .nex-product .nb-btn:hover { transform:translate(3px,3px); box-shadow:3px 3px 0 var(--ink); }
        .nex-product .nb-btn:hover::before { transform:translateY(0); }
        .nex-product .nb-btn:active { transform:translate(6px,6px); box-shadow:0 0 0 var(--ink); }
        .nex-product .nb-btn svg { transition:transform .25s cubic-bezier(.3,1.6,.5,1); }
        .nex-product .nb-btn:hover svg { transform:translateX(6px); }
        .nex-product .nb-dark { background:var(--ink); color:#fff!important; --wipe:var(--lime); }
        .nex-product .nb-dark:hover { color:var(--ink)!important; }
        .nex-product .nb-light { background:#fff; color:var(--ink)!important; --wipe:var(--yellow); }
        .nex-product .nb-white { background:#fff; color:var(--ink)!important; --wipe:var(--lime); }
        .nex-product .nb-small { min-height:48px; padding:0 20px; font-size:14px; box-shadow:4px 4px 0 var(--ink); }

        /* ---------- hero ---------- */
        .hero { position:relative; max-width:1360px; margin:auto; padding:56px 34px 48px; isolation:isolate; }
        .hero-shapes { position:absolute; inset:0; z-index:-1; pointer-events:none; }
        .sh { position:absolute; display:block; translate:calc(var(--mx) * var(--k)) calc(var(--my) * var(--k)); border:3px solid var(--ink); }
        .sh-1 { width:92px; height:92px; border-radius:50%; background:var(--lime); right:6%; top:2%; animation:bob 6s ease-in-out infinite; }
        .sh-2 { width:64px; height:64px; background:var(--orange); left:1%; top:44%; animation:spin 14s linear infinite; }
        .sh-3 { width:130px; height:130px; border-radius:50%; border-style:dashed; background:transparent; right:1%; top:52%; animation:spin 22s linear infinite reverse; }
        .sh-4 { width:42px; height:42px; background:var(--yellow); left:44%; top:1%; animation:bob 4.5s ease-in-out infinite -2s; }
        .sh-5 { border:none; color:var(--ink); left:2%; top:7%; animation:spin 9s linear infinite; }
        @keyframes bob { 0%,100% { transform:translateY(0) rotate(0); } 50% { transform:translateY(-18px) rotate(8deg); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .hero-top { display:grid; grid-template-columns:1.1fr .9fr; gap:56px; align-items:center; }
        .hero-copy { text-align:left; position:relative; z-index:2; }
        .nex-product .nb-badge { height:auto; display:inline-flex; align-items:center; gap:8px; padding:8px 14px; border:3px solid var(--ink); border-radius:0; background:var(--yellow); color:var(--ink); font-family:var(--font-mono),monospace; font-size:13px; font-weight:700; letter-spacing:.08em; box-shadow:4px 4px 0 var(--ink); transform:rotate(-1.5deg); transition:transform .25s cubic-bezier(.3,1.6,.5,1); }
        .nex-product .nb-badge:hover { transform:rotate(1.5deg) scale(1.04); }
        .hero h1 { margin:28px 0 24px; font-size:clamp(46px,6.4vw,102px); line-height:.96; letter-spacing:-.055em; font-weight:700; }
        .hl { padding:0 .1em; margin:0 -.1em; background:linear-gradient(var(--lime),var(--lime)) 0 90%/0% 62% no-repeat; transition:background-size .9s .35s cubic-bezier(.2,.7,.2,1); box-decoration-break:clone; -webkit-box-decoration-break:clone; }
        .reveal.is-visible .hl { background-size:100% 62%; }
        .hl-white { background-image:linear-gradient(#fff,#fff); }
        .hero-description { max-width:600px; margin:0; font-size:21px; line-height:1.55; font-weight:500; }
        .hero-actions { display:flex; flex-wrap:wrap; gap:20px; margin-top:34px; }
        .mini-row { display:flex; flex-wrap:wrap; gap:14px; margin-top:34px; }
        .hero-proof { display:flex; align-items:center; gap:14px; margin-top:28px; font-family:var(--font-mono),monospace; font-size:14px; font-weight:700; }
        .proof-avatars { display:flex; }
        .nex-product .proof-av { width:40px; height:40px; margin-left:-8px; border:3px solid var(--ink); border-radius:0; transition:transform .25s cubic-bezier(.3,1.6,.5,1); }
        .nex-product .proof-av:first-child { margin-left:0; }
        .nex-product .proof-av:hover { transform:translateY(-6px) rotate(-6deg); z-index:3; }
        .nex-product .proof-av > span { border-radius:0; }
        .av-1 > span { background:var(--lime)!important; } .av-2 > span { background:var(--yellow)!important; } .av-3 > span { background:var(--orange)!important; }

        /* small one-liner cards (shared) */
        .mini { position:relative; overflow:hidden; isolation:isolate; display:inline-flex; align-items:center; gap:10px; padding:11px 16px; border:3px solid var(--ink); background:#fff; font-size:16px; font-weight:700; box-shadow:0 0 0 var(--ink); transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s ease,color .2s ease; cursor:default; }
        .mini::before { content:""; position:absolute; inset:0; z-index:-1; background:var(--lime); transform:scaleX(0); transform-origin:left; transition:transform .38s cubic-bezier(.2,.8,.2,1); }
        .mini:hover { transform:translate(-3px,-3px); box-shadow:5px 5px 0 var(--ink); }
        .mini:hover::before { transform:scaleX(1); }
        .mini svg { transition:transform .35s cubic-bezier(.3,1.6,.5,1); }
        .mini:hover svg { transform:rotate(-14deg) scale(1.2); }
        .mini-row .mini:nth-child(2)::before { background:var(--yellow); } .mini-row .mini:nth-child(3)::before { background:var(--sky); }

        /* loader card */
        .hero-loader-wrap { position:relative; z-index:2; }
        .loader-card { position:relative; overflow:hidden; border:3px solid var(--ink); background:var(--loader-bg); box-shadow:12px 12px 0 var(--ink); transition:transform .3s ease,box-shadow .3s ease; }
        .loader-card:hover { transform:translate(-4px,-4px); box-shadow:16px 16px 0 var(--ink); }
        .loader-top { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border-bottom:3px solid var(--ink); background:var(--yellow); font-family:var(--font-mono),monospace; font-size:14px; font-weight:700; letter-spacing:.06em; }
        .live { display:inline-flex; align-items:center; gap:8px; padding:2px 8px; background:var(--ink); color:var(--lime); font-size:12px; }
        .live-dot { width:8px; height:8px; border:none; background:var(--lime); border-radius:50%; }
        .loader-stage { height:430px; display:grid; place-items:center; padding-bottom:30px; background:var(--loader-bg); background-image:radial-gradient(rgba(13,13,13,.16) 1.4px,transparent 1.4px); background-size:20px 20px; }
        .loader-stage .nx-loader { margin-top:-10px; }
        .loader-foot { display:flex; align-items:center; gap:12px; padding:14px 18px; border-top:3px solid var(--ink); background:var(--ink); color:var(--lime); font-family:var(--font-mono),monospace; font-size:14px; font-weight:700; position:relative; z-index:5; }
        .seal { position:absolute; z-index:6; top:-30px; left:-30px; width:84px; height:84px; display:grid; place-items:center; background:var(--orange); color:var(--ink); border:3px solid var(--ink); border-radius:50%; box-shadow:4px 4px 0 var(--ink); animation:spin 10s linear infinite; }
        .float-chip { position:absolute; z-index:6; display:flex; align-items:center; gap:10px; padding:11px 16px; border:3px solid var(--ink); background:var(--lime); box-shadow:5px 5px 0 var(--ink); font-size:15px; font-weight:700; white-space:nowrap; animation:chip-float 5s ease-in-out infinite; transition:box-shadow .2s ease; }
        .float-chip:hover { box-shadow:8px 8px 0 var(--ink); }
        .chip-top { right:-18px; top:76px; transform:rotate(3deg); } .chip-bottom { left:-26px; bottom:70px; background:#fff; animation-delay:-2s; transform:rotate(-3deg); }
        @keyframes chip-float { 0%,100% { translate:0 0; } 50% { translate:0 -10px; } }

        /* product preview (clearer: bigger type, flat, high contrast) */
        .hero-stage { max-width:1120px; margin:80px auto 0; position:relative; }
        .product-window { border:3px solid var(--ink); background:#fff; box-shadow:12px 12px 0 var(--ink); transition:transform .3s ease,box-shadow .3s ease; }
        .product-window:hover { transform:translate(-3px,-3px); box-shadow:16px 16px 0 var(--ink); }
        .window-topbar { height:54px; display:flex; align-items:center; padding:0 18px; border-bottom:3px solid var(--ink); background:var(--yellow); }
        .window-dots { display:flex; gap:7px; } .window-dots i { width:14px; height:14px; border:2px solid var(--ink); background:#fff; } .window-dots i:first-child { background:var(--orange); } .window-dots i:nth-child(2) { background:var(--lime); }
        .window-title { margin:auto; font-family:var(--font-mono),monospace; font-size:14px; font-weight:700; } .window-title span { margin:0 8px; }
        .window-top-icon { width:30px; height:30px; display:grid; place-items:center; border:3px solid var(--ink); background:#fff; transition:transform .3s,background .2s; } .window-top-icon:hover { transform:rotate(90deg); background:var(--lime); }
        .mock-workspace { min-height:480px; display:grid; grid-template-columns:240px 1fr; }
        .mock-sidebar { position:relative; padding:22px 16px; border-right:3px solid var(--ink); background:var(--paper2); }
        .mock-brand { display:flex; align-items:center; gap:10px; font-size:16px; margin-bottom:22px; }
        .mini-brand { width:30px; height:30px; display:grid; place-items:center; background:var(--ink); color:var(--lime); border:2px solid var(--ink); }
        .mock-new { width:100%; margin-bottom:24px; font-size:15px; }
        .mock-sidebar small { display:block; font-family:var(--font-mono),monospace; font-size:12px; font-weight:700; letter-spacing:.12em; margin:0 0 10px 4px; }
        .mock-side-row { width:100%; display:flex; margin-bottom:8px; padding:9px 11px; font-size:14px; border-width:2px; white-space:nowrap; }
        .mock-side-row span { width:9px; height:9px; background:var(--ink); flex-shrink:0; transition:transform .3s; } .mock-side-row:hover span { transform:rotate(135deg) scale(1.3); }
        .mock-side-row.active { background:var(--lime); }
        .mock-side-bottom { position:absolute; bottom:16px; left:16px; right:16px; display:flex; align-items:center; gap:10px; padding-top:14px; border-top:3px solid var(--ink); font-size:14px; font-weight:700; }
        .mock-avatar { width:30px; height:30px; display:grid; place-items:center; background:var(--orange); border:2px solid var(--ink); font-size:14px; font-weight:700; } .mock-ellipsis { margin-left:auto; }
        .mock-chat { min-width:0; padding:24px 28px 16px; }
        .mock-chat-heading { display:flex; justify-content:space-between; align-items:center; gap:10px; }
        .mock-chat-heading strong { display:block; font-size:19px; letter-spacing:-.03em; } .mock-chat-heading small { display:block; font-size:14px; margin-top:4px; opacity:.7; }
        .mock-pill { display:flex; align-items:center; gap:8px; padding:6px 12px; border:3px solid var(--ink); background:#fff; font-family:var(--font-mono),monospace; font-size:13px; font-weight:700; white-space:nowrap; } .mock-pill span { width:9px; height:9px; background:var(--lime); border:2px solid var(--ink); border-radius:50%; animation:blink 1.4s steps(2) infinite; }
        .nex-product .mock-msg { margin:22px 0 18px; max-width:100%; }
        .nex-product .mock-bubble { background:var(--yellow)!important; color:var(--ink)!important; border:3px solid var(--ink); border-radius:0!important; padding:12px 16px; font-size:16px; font-weight:500; box-shadow:4px 4px 0 var(--ink); }
        .mock-model-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
        .mock-answer { min-width:0; padding:16px; border:3px solid var(--ink); background:#fff; box-shadow:4px 4px 0 var(--ink); animation:answer-rise .7s both; transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease,background .25s ease; }
        .mock-answer:nth-child(2) { animation-delay:.15s; } .mock-answer:nth-child(3) { animation-delay:.3s; }
        .mock-answer:hover { transform:translate(-4px,-4px); box-shadow:9px 9px 0 var(--ink); background:var(--paper); }
        @keyframes answer-rise { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .mock-answer-head { display:flex; align-items:center; gap:10px; min-width:0; }
        .mock-answer-head b { display:block; font-size:15px; } .mock-answer-head small { display:block; font-size:12px; opacity:.65; margin-top:2px; }
        .answer-dot { width:9px; height:9px; background:var(--lime); border:2px solid var(--ink); border-radius:50%; margin-left:auto; align-self:flex-start; animation:blink 1.6s steps(2) infinite; }
        .mock-answer p { margin:14px 0; font-size:15px; line-height:1.5; font-weight:500; }
        .nex-product .answer-tag { height:auto; padding:4px 10px; border:2px solid var(--ink); border-radius:0; color:var(--ink); font-family:var(--font-mono),monospace; font-size:12px; font-weight:700; }
        .tag-lime { background:var(--lime)!important; } .tag-yellow { background:var(--yellow)!important; } .tag-sky { background:var(--sky)!important; }
        .model-mark { width:36px; height:36px; display:grid; place-items:center; flex-shrink:0; border:2px solid var(--ink); color:var(--ink); transition:transform .35s cubic-bezier(.3,1.6,.5,1); }
        .mm-openai { background:var(--lime); } .mm-gemini { background:var(--yellow); } .mm-claude { background:var(--orange); }
        *:hover > .model-mark,.model-mark:hover { transform:rotate(-10deg) scale(1.08); }
        .nex-product .mock-suggest { margin-top:16px; }
        .nex-product .nb-suggest { height:auto; padding:7px 14px; border:3px solid var(--ink); border-radius:0; background:#fff; color:var(--ink); font-family:var(--font-mono),monospace; font-size:13px; font-weight:700; box-shadow:3px 3px 0 var(--ink); transition:transform .18s,box-shadow .18s,background .2s; }
        .nex-product .nb-suggest:hover { transform:translate(2px,2px); box-shadow:1px 1px 0 var(--ink); background:var(--lime); }
        .mock-composer { height:56px; display:flex; align-items:center; justify-content:space-between; margin-top:16px; padding:0 8px 0 16px; border:3px solid var(--ink); background:#fff; font-size:16px; font-weight:500; }
        .typing { display:inline-block; overflow:hidden; white-space:nowrap; border-right:3px solid var(--ink); animation:typing 3.6s steps(18) infinite alternate,caret .8s steps(2) infinite; }
        @keyframes typing { from { width:0; } 60%,to { width:18ch; } } @keyframes caret { 50% { border-color:transparent; } }
        .mock-send { width:40px; height:40px; display:grid; place-items:center; background:var(--ink); color:var(--lime); transition:transform .25s,background .2s,color .2s; } .mock-composer:hover .mock-send { transform:rotate(-12deg) scale(1.08); background:var(--orange); color:var(--ink); }
        .mock-caption { text-align:center; font-family:var(--font-mono),monospace; font-size:12px; margin-top:12px; opacity:.7; }
        .hero-bottom-note { max-width:1120px; margin:44px auto 0; display:flex; align-items:center; gap:16px; font-family:var(--font-mono),monospace; font-size:14px; letter-spacing:.14em; font-weight:700; }
        .note-line { height:3px; flex:1; background:var(--ink); }

        /* ---------- marquee ---------- */
        .marquee { border-block:3px solid var(--ink); background:var(--ink); color:var(--lime); overflow:hidden; white-space:nowrap; font-family:var(--font-mono),monospace; font-size:22px; font-weight:700; text-transform:uppercase; }
        .marquee-track { display:inline-flex; width:max-content; padding:16px 0; animation:marquee 30s linear infinite; }
        .marquee:hover .marquee-track { animation-play-state:paused; }
        .marquee-set { display:inline-flex; } .marquee-item { display:inline-flex; align-items:center; gap:24px; padding-right:24px; }
        .marquee-yellow { background:var(--yellow); color:var(--ink); } .marquee-reverse .marquee-track { animation-direction:reverse; }
        @keyframes marquee { to { transform:translateX(-50%); } }

        /* ---------- shared section ---------- */
        .section-pad { padding:130px max(34px,calc((100vw - 1200px)/2)); }
        .section-kicker { display:inline-flex; align-items:center; gap:8px; padding:7px 14px; background:var(--ink); color:var(--lime); font-family:var(--font-mono),monospace; font-size:14px; font-weight:700; letter-spacing:.1em; transform:rotate(-1.5deg); margin:0; }
        .manifesto h2,.section-heading h2,.workflow-intro h2,.faq-intro h2,.final-cta h2 { font-size:clamp(42px,5.6vw,80px); line-height:1; letter-spacing:-.05em; font-weight:700; margin:26px 0 22px; }

        /* ---------- manifesto ---------- */
        .manifesto { display:grid; grid-template-columns:.9fr 1.1fr; align-items:center; gap:70px; background:var(--lime); }
        .manifesto-copy,.section-heading>p:last-child,.workflow-intro>p:not(.section-kicker),.faq-intro>p:not(.section-kicker),.final-cta>div>p:not(.section-kicker) { max-width:480px; font-size:20px; line-height:1.6; font-weight:500; margin:0; }
        .manifesto-art { height:460px; position:relative; display:grid; place-items:center; overflow:hidden; border:3px solid var(--ink); background:#fff; background-image:radial-gradient(rgba(13,13,13,.2) 1.5px,transparent 1.5px); background-size:22px 22px; box-shadow:12px 12px 0 var(--ink); }
        .art-sq { position:absolute; left:50%; top:50%; border:3px solid var(--ink); translate:-50% -50%; }
        .sq-one { width:360px; height:360px; animation:spin 26s linear infinite; } .sq-two { width:270px; height:270px; border-style:dashed; animation:spin 18s linear infinite reverse; } .sq-three { width:180px; height:180px; background:var(--yellow); animation:spin 12s linear infinite; }
        .art-core { position:relative; z-index:2; width:116px; height:116px; display:grid; place-items:center; border:3px solid var(--ink); background:var(--orange); box-shadow:8px 8px 0 var(--ink); animation:core-bob 4s ease-in-out infinite; transition:background .2s; } .art-core:hover { background:var(--lime); }
        @keyframes core-bob { 0%,100% { transform:translateY(0) rotate(-6deg); } 50% { transform:translateY(-12px) rotate(5deg); } }
        .art-orb { position:absolute; z-index:3; display:grid; place-items:center; border:3px solid var(--ink); box-shadow:5px 5px 0 var(--ink); animation:bob 5s ease-in-out infinite; transition:box-shadow .2s; } .art-orb:hover { box-shadow:9px 9px 0 var(--ink); }
        .orb-orange { width:70px; height:70px; top:44px; left:14%; background:var(--orange); } .orb-yellow { width:60px; height:60px; right:14%; top:62px; background:var(--yellow); animation-delay:-2s; } .orb-sky { width:76px; height:76px; right:20%; bottom:56px; background:var(--sky); animation-delay:-3s; }
        .art-label { position:absolute; z-index:3; padding:4px 10px; background:var(--ink); color:var(--lime); font-family:var(--font-mono),monospace; font-size:13px; font-weight:700; letter-spacing:.14em; }
        .art-label-left { left:5%; top:52%; } .art-label-right { right:4%; top:46%; } .art-label-bottom { bottom:18px; left:42%; }

        /* ---------- capabilities + cards ---------- */
        .capabilities { background:transparent; }
        .section-heading { text-align:center; max-width:760px; margin:0 auto 70px; } .section-heading .section-kicker { margin-inline:auto; } .section-heading>p:last-child { margin:0 auto; }
        .feature-grid { display:grid; grid-template-columns:1fr 1fr; gap:44px 36px; }
        .feature-wide { grid-column:1/-1; }
        .reveal > .nb-card { height:100%; }
        .nex-product .nb-card { position:relative; display:block; gap:0; padding:34px; border:3px solid var(--ink); border-radius:0; background:#fff; color:var(--ink); box-shadow:9px 9px 0 var(--ink); transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s ease,background-color .35s ease; }
        .nex-product .nb-card:hover { transform:translate(-5px,-5px); box-shadow:14px 14px 0 var(--ink); background-color:var(--accent,var(--lime)); }
        .nb-card::after { content:""; position:absolute; inset:10px; pointer-events:none; opacity:0; transition:opacity .25s ease; background-image:repeating-linear-gradient(90deg,var(--ink) 0 10px,transparent 10px 20px),repeating-linear-gradient(90deg,var(--ink) 0 10px,transparent 10px 20px),repeating-linear-gradient(0deg,var(--ink) 0 10px,transparent 10px 20px),repeating-linear-gradient(0deg,var(--ink) 0 10px,transparent 10px 20px); background-size:100% 3px,100% 3px,3px 100%,3px 100%; background-position:0 0,0 100%,0 0,100% 0; background-repeat:no-repeat; }
        .nb-card:hover::after { opacity:.55; animation:ants 1s linear infinite; }
        @keyframes ants { to { background-position:20px 0,-20px 100%,0 -20px,100% 20px; } }
        .c-lime { --accent:var(--lime); } .c-yellow { --accent:var(--yellow); } .c-sky { --accent:var(--sky); }
        .card-tab { position:absolute; top:-3px; left:26px; transform:translateY(-100%); padding:6px 14px; border:3px solid var(--ink); border-bottom:none; background:var(--accent,var(--lime)); font-family:var(--font-mono),monospace; font-size:13px; font-weight:700; letter-spacing:.08em; transition:transform .25s cubic-bezier(.3,1.6,.5,1); }
        .nb-card:hover .card-tab { transform:translateY(-100%) translateY(-6px) rotate(-2deg); }
        .feature-card { min-height:500px; }
        .feature-wide .feature-card { min-height:420px; display:grid!important; grid-template-columns:1fr 1fr; align-items:center; gap:30px; }
        .feature-card-copy { position:relative; z-index:2; max-width:460px; }
        .feature-icon { width:56px; height:56px; display:grid; place-items:center; margin-bottom:22px; border:3px solid var(--ink); background:var(--ink); color:var(--lime); box-shadow:4px 4px 0 var(--orange); transition:transform .4s cubic-bezier(.3,1.6,.5,1); }
        .nb-card:hover .feature-icon { transform:rotate(-12deg) scale(1.1); }
        .feature-card h3 { font-size:clamp(30px,3.2vw,44px); line-height:1.05; letter-spacing:-.05em; margin:0 0 14px; font-weight:700; }
        .feature-card p { max-width:430px; font-size:18px; line-height:1.55; font-weight:500; margin:0; }
        .feature-art { min-width:0; position:relative; min-height:300px; display:grid; place-items:center; }
        .stack-card { position:absolute; width:min(340px,92%); height:82px; display:flex; align-items:center; gap:14px; padding:0 18px; font-size:17px; box-shadow:5px 5px 0 var(--ink); }
        .stack-card .model-mark { width:42px; height:42px; }
        .stack-back { transform:translate(22px,-92px) rotate(5deg); } .stack-mid { transform:translate(-10px,0) rotate(-3deg); } .stack-front { transform:translate(10px,92px) rotate(2deg); } .stack-front>svg { margin-left:auto; }
        .nex-product .stack-back:hover { transform:translate(36px,-98px) rotate(0); } .nex-product .stack-mid:hover { transform:translate(-24px,-6px) rotate(0); } .nex-product .stack-front:hover { transform:translate(26px,86px) rotate(0); }
        .doc-art { position:absolute; width:260px; height:240px; right:26px; bottom:22px; }
        .doc-sheet { position:absolute; width:150px; height:190px; padding:18px 14px; border:3px solid var(--ink); background:#fff; box-shadow:5px 5px 0 var(--ink); overflow:hidden; transition:transform .35s cubic-bezier(.3,1.4,.5,1); }
        .sheet-back { right:14px; top:8px; transform:rotate(10deg); background:var(--paper2); } .sheet-front { right:84px; top:20px; transform:rotate(-5deg); }
        .nb-card:hover .sheet-back { transform:rotate(16deg) translateX(10px); } .nb-card:hover .sheet-front { transform:rotate(-8deg) translateX(-8px); }
        .doc-sheet-icon { width:34px; height:34px; display:grid; place-items:center; background:var(--ink); color:var(--yellow); margin-bottom:12px; }
        .doc-sheet b { display:block; font-size:14px; margin-bottom:10px; }
        .doc-sheet span { display:block; height:5px; margin:8px 0; width:100%; background:var(--ink); opacity:.85; } .doc-sheet .doc-line-short { width:58%; }
        .doc-highlight { margin-top:12px; padding:5px 6px; background:var(--lime); border:2px solid var(--ink); font-family:var(--font-mono),monospace; font-size:11px; font-weight:700; animation:hl-flash 2.4s steps(2) infinite; }
        @keyframes hl-flash { 50% { background:var(--orange); } }
        .scan-line { position:absolute; left:0; right:0; height:4px; background:var(--orange); animation:scan 2.6s linear infinite; }
        @keyframes scan { from { top:-6px; } to { top:100%; } }
        .doc-spark { position:absolute; right:6px; bottom:8px; width:46px; height:46px; display:grid; place-items:center; background:var(--orange); border:3px solid var(--ink); box-shadow:4px 4px 0 var(--ink); animation:bob 3.5s ease-in-out infinite; }
        .history-art { position:absolute; left:34px; right:34px; bottom:30px; display:grid; gap:12px; }
        .history-row { display:flex; width:100%; padding:11px 14px; gap:12px; }
        .history-bullet { width:30px; height:30px; background:var(--ink); flex-shrink:0; transition:transform .3s; } .history-row:hover .history-bullet { transform:rotate(45deg); }
        .history-row>div { flex:1; min-width:0; } .history-row b { display:block; font-size:16px; } .history-row i { display:block; width:62%; height:5px; margin-top:7px; background:var(--ink); opacity:.5; }
        .history-star { margin-left:auto; animation:spin 4s linear infinite; }
        .hr-1 { animation:row-on 6s steps(1) infinite; } .hr-2 { animation:row-on 6s steps(1) infinite 2s; } .hr-3 { animation:row-on 6s steps(1) infinite 4s; }
        @keyframes row-on { 0%,33% { background:var(--yellow); } 34%,100% { background:#fff; } }

        /* ---------- workflow ---------- */
        .workflow { display:grid; grid-template-columns:.85fr 1.15fr; gap:80px; align-items:start; background:var(--sky); }
        .workflow-intro { position:sticky; top:40px; }
        .text-link { display:inline-flex; align-items:center; gap:10px; margin-top:26px; padding:4px 0; border-bottom:4px solid var(--ink); font-family:var(--font-mono),monospace; font-size:16px; font-weight:700; text-transform:uppercase; transition:gap .25s ease,background .2s; } .text-link:hover { gap:20px; background:var(--lime); }
        .workflow-steps { display:grid; gap:34px; }
        .nex-product .workflow-step { display:grid; grid-template-columns:54px 190px 1fr; align-items:center; gap:22px; padding:24px; --accent:var(--yellow); }
        .nex-product .workflow-step:hover { transform:translate(-5px,-5px) translateX(8px); }
        .workflow-step h3 { font-size:26px; letter-spacing:-.04em; margin:0 0 8px; } .workflow-step p { margin:0; font-size:17px; line-height:1.5; font-weight:500; }
        .step-number { align-self:start; width:54px; height:54px; display:grid; place-items:center; background:var(--ink); color:var(--lime); font-family:var(--font-mono),monospace; font-size:20px; font-weight:700; transition:transform .35s cubic-bezier(.3,1.6,.5,1); } .nb-card:hover .step-number { transform:rotate(-10deg) scale(1.08); }
        .step-visual { min-height:130px; display:flex; flex-direction:column; justify-content:center; gap:9px; position:relative; padding:14px; border:3px solid var(--ink); background:var(--paper); }
        .step-bubble { display:inline-block; overflow:hidden; white-space:nowrap; padding:9px 11px; border:3px solid var(--ink); background:#fff; font-size:14px; font-weight:700; animation:bubble-in 4s steps(28) infinite; max-width:fit-content; }
        @keyframes bubble-in { 0% { max-width:0; } 55%,100% { max-width:100%; } }
        .step-cursor { position:absolute; right:16px; bottom:18px; width:3px; height:20px; background:var(--ink); animation:caret .8s steps(2) infinite; }
        .step-model { width:100%; padding:7px 10px; font-size:14px; border-width:2px; } .step-model .model-mark { width:26px; height:26px; } .step-model>svg { margin-left:auto; } .muted-model { opacity:.5; }
        .step-answers { flex-direction:row; align-items:center; justify-content:center; gap:8px; }
        .answer-mini { width:44px; height:70px; padding:10px 6px; display:grid; align-content:start; gap:7px; border:3px solid var(--ink); background:#fff; transform:rotate(-6deg); transition:transform .35s cubic-bezier(.3,1.5,.5,1); }
        .answer-mini-two { transform:translateY(-6px); background:var(--yellow); } .answer-mini-three { transform:rotate(6deg); background:var(--lime); }
        .answer-mini i { height:4px; background:var(--ink); display:block; }
        .nb-card:hover .answer-mini-one { transform:rotate(-14deg) translateX(-8px); } .nb-card:hover .answer-mini-two { transform:translateY(-14px); } .nb-card:hover .answer-mini-three { transform:rotate(14deg) translateX(8px); }
        .answer-mini-check { position:absolute; right:8px; bottom:8px; width:32px; height:32px; display:grid; place-items:center; border:3px solid var(--ink); border-radius:50%; background:var(--orange); animation:pop 1.8s ease-in-out infinite; }
        @keyframes pop { 50% { transform:scale(1.18); } }

        /* ---------- statement ---------- */
        .statement-section { position:relative; overflow:hidden; isolation:isolate; min-height:640px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:130px 24px; background:var(--ink); color:#fff; border-top:3px solid var(--ink); }
        .statement-section .section-kicker { background:var(--lime); color:var(--ink); }
        .statement-section h2 { position:relative; z-index:2; font-size:clamp(46px,7.4vw,112px); line-height:.95; letter-spacing:-.06em; margin:28px 0 22px; font-weight:700; } .statement-section h2 span { color:var(--lime); }
        .statement-section p:not(.section-kicker) { max-width:560px; font-size:21px; line-height:1.55; margin:0 auto 32px; font-weight:500; }
        .statement-noise { position:absolute; inset:0; z-index:-1; opacity:.2; background-image:radial-gradient(#fff 1px,transparent 1px); background-size:14px 14px; animation:grid-pan 30s linear infinite; }
        .outline-word { position:absolute; z-index:-1; left:0; top:50%; translate:0 -50%; white-space:nowrap; font-size:clamp(120px,20vw,280px); font-weight:700; letter-spacing:-.05em; color:transparent; -webkit-text-stroke:2px rgba(200,255,46,.35); animation:marquee 40s linear infinite; }
        .hazard { position:absolute; left:0; right:0; height:26px; z-index:3; background:repeating-linear-gradient(-45deg,var(--yellow) 0 22px,var(--ink) 22px 44px); background-size:62px 100%; animation:hazard 2s linear infinite; border-block:3px solid var(--ink); }
        .hazard-top { top:0; } .hazard-bottom { bottom:0; animation-direction:reverse; }
        @keyframes hazard { to { background-position:62px 0; } }

        /* ---------- faq ---------- */
        .faq-section { display:grid; grid-template-columns:.85fr 1.15fr; gap:80px; align-items:start; }
        .faq-intro h2 { font-size:clamp(40px,4.8vw,66px); }
        .nex-product .faq-item { margin-bottom:20px; border:3px solid var(--ink); background:#fff; box-shadow:7px 7px 0 var(--ink); transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease,background .25s ease; }
        .nex-product .faq-item:hover { transform:translate(-3px,-3px); box-shadow:11px 11px 0 var(--ink); }
        .nex-product .faq-item[data-state=open] { background:var(--yellow); }
        .nex-product .faq-trigger { padding:22px 24px; font-size:21px; font-weight:700; letter-spacing:-.03em; line-height:1.25; text-decoration:none!important; align-items:center; }
        .nex-product .faq-trigger svg { width:30px; height:30px; padding:4px; border:3px solid var(--ink); background:var(--ink); color:var(--lime); flex-shrink:0; transition:transform .3s ease,background .2s; }
        .nex-product .faq-trigger:hover svg { background:var(--orange); color:var(--ink); }
        .nex-product .faq-content,.nex-product .faq-content > div { font-size:18px; line-height:1.65; font-weight:500; }
        .nex-product .faq-content { padding:0 24px 22px; }
        .nex-product .faq-content > div { padding-bottom:0; }

        /* ---------- final cta ---------- */
        .final-cta { padding:130px 24px 120px; text-align:center; background:var(--orange); border-top:3px solid var(--ink); }
        .final-cta>div { max-width:820px; margin:auto; }
        .cta-symbol { width:76px; height:76px; margin:0 auto 26px; display:grid; place-items:center; border:3px solid var(--ink); background:var(--lime); box-shadow:6px 6px 0 var(--ink); animation:wobble 3s ease-in-out infinite; }
        @keyframes wobble { 0%,100% { transform:rotate(-7deg); } 50% { transform:rotate(7deg) scale(1.06); } }
        .final-cta .section-kicker { margin-inline:auto; }
        .final-cta>div>p:not(.section-kicker) { margin:0 auto 32px; max-width:560px; }
        .cta-note { display:block; margin-top:20px; font-family:var(--font-mono),monospace; font-size:14px; font-weight:700; }

        /* ---------- footer ---------- */
        .site-footer { max-width:1360px; margin:auto; padding:48px 34px 28px; }
        .footer-main { display:grid; grid-template-columns:1fr 1fr auto; align-items:center; gap:24px; padding-bottom:28px; } .footer-main p { font-size:17px; font-weight:500; margin:0; }
        .footer-links { display:flex; flex-wrap:wrap; gap:26px; font-size:16px; font-weight:700; }
        .nex-product .footer-sep { height:3px; background:var(--ink); }
        .footer-bottom { display:flex; justify-content:space-between; gap:15px; padding-top:22px; font-family:var(--font-mono),monospace; font-size:14px; font-weight:700; } .footer-bottom a { transition:transform .2s; display:inline-block; } .footer-bottom a:hover { transform:translateY(-4px); }

        /* ---------- reveal ---------- */
        .reveal { opacity:0; transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1); }
        .reveal-up { transform:translateY(36px); } .reveal-left { transform:translateX(-48px); } .reveal-right { transform:translateX(48px); } .reveal-pop { transform:scale(.94) translateY(24px); }
        .reveal.is-visible { opacity:1; transform:none; transition-delay:var(--d,0ms); }

        @media (prefers-reduced-motion:reduce) {
          html { scroll-behavior:auto!important; }
          .reveal { opacity:1; transform:none; transition:none; }
          .nex-product::before,.sh,.seal,.float-chip,.marquee-track,.outline-word,.hazard,.art-sq,.art-core,.art-orb,.doc-spark,.scan-line,.history-star,.hr-1,.hr-2,.hr-3,.cta-symbol,.typing,.step-bubble,.mock-answer,.statement-noise { animation:none!important; }
          .typing { width:18ch; } .step-bubble { max-width:100%; }
        }

        @media (max-width:1000px) {
          .hero-top,.manifesto,.workflow,.faq-section { grid-template-columns:1fr; gap:48px; }
          .workflow-intro { position:static; }
          .section-pad { padding-top:90px; padding-bottom:90px; }
          .mock-workspace { grid-template-columns:180px 1fr; }
          .mock-model-grid { grid-template-columns:1fr; }
          .chip-top { right:-6px; } .chip-bottom { left:-6px; }
          .feature-grid { grid-template-columns:1fr; } .feature-wide .feature-card { grid-template-columns:1fr; }
          .doc-art { transform:scale(.9); transform-origin:bottom right; right:10px; }
          .nex-product .workflow-step { grid-template-columns:44px 140px 1fr; gap:14px; padding:18px; }
        }
        @media (max-width:650px) {
          .nex-product { font-size:16px; }
          .announcement { font-size:11px; gap:6px; }
          .site-nav { height:72px; padding:0 18px; } .desktop-nav,.nav-actions { display:none; }
          .mobile-menu { display:grid; place-items:center; width:46px; height:46px; border:3px solid var(--ink); background:var(--lime); box-shadow:3px 3px 0 var(--ink); }
          .hero { padding:36px 18px 32px; } .hero h1 { font-size:clamp(42px,12vw,64px); } .hero-description { font-size:18px; }
          .hero-actions { flex-direction:column; align-items:stretch; } .nex-product .nb-btn { width:100%; }
          .seal { width:64px; height:64px; left:-8px; top:-24px; } .float-chip { font-size:13px; padding:8px 11px; }
          .loader-stage { height:340px; } .chip-top { top:60px; } .chip-bottom { bottom:62px; }
          .hero-stage { margin-top:56px; }
          .mock-workspace { display:block; min-height:0; } .mock-sidebar { display:none; } .mock-chat { padding:16px 14px 12px; }
          .mock-chat-heading strong { font-size:16px; } .mock-model-grid { gap:12px; }
          .art-label-left { left:3%; } .manifesto-art { height:380px; } .sq-one { width:290px; height:290px; } .sq-two { width:220px; height:220px; }
          .nex-product .nb-card { padding:24px; box-shadow:6px 6px 0 var(--ink); } .feature-card { min-height:480px; }
          .nex-product .workflow-step { grid-template-columns:1fr; } .step-number { width:44px; height:44px; }
          .history-art { left:18px; right:18px; } .stack-card { height:72px; font-size:15px; }
          .footer-main { grid-template-columns:1fr; } .footer-bottom { flex-direction:column; }
          .marquee { font-size:17px; }
        }
      `}</style>
        </main>
    );
}