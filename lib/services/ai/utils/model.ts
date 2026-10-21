
import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";

export type AIProvider = "openai" | "google" | "anthropic";

export type ModelConfig = {
    provider: AIProvider;
    modelId: string;
    apiKey: string;
};

export function getChatModel({
    provider,
    modelId,
    apiKey,
}: ModelConfig) {
    if (!apiKey.trim()) {
        throw new Error("An API key is required.");
    }

    switch (provider) {
        case "openai":
            return createOpenAI({ apiKey })(modelId);

        case "google":
            return createGoogleGenerativeAI({ apiKey })(modelId);

        case "anthropic":
            return createAnthropic({ apiKey })(modelId);
    }
}
