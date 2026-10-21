import type { AIProvider } from "@/lib/services/ai/utils/model";
export type { AIProvider };
export type ModelSelection = { provider: AIProvider; modelId: string };
export type ProviderResult = { provider: AIProvider; modelId: string; text: string; durationMs: number; status: "completed" | "failed"; error?: string };
