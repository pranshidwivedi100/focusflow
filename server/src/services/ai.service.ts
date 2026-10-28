import { env } from "../config/env.js";
import type { AnalysisResult, InboxItem } from "../types/index.js";
import type { AIProvider } from "./ai.provider.js";
import { GeminiProvider } from "./gemini.service.js";
import { generateFallbackAnalysis } from "./mock-data.service.js";

function createProvider(): AIProvider {
  const provider = env.aiProvider.toLowerCase();

  switch (provider) {
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${env.aiProvider}`);
  }
}

const aiProvider = createProvider();

export async function analyzePriorities(
  items: InboxItem[],
): Promise<AnalysisResult> {
  const apiKey = env.geminiApiKey;
  const isKeyValid =
    apiKey &&
    apiKey !== "your-gemini-api-key" &&
    apiKey.trim().length > 10;

  if (isKeyValid) {
    try {
      return await aiProvider.analyze(items);
    } catch (err: any) {
      console.warn(
        "[AI] Gemini API call failed, switching to intelligent fallback prioritization:",
        err.message || err,
      );
      return generateFallbackAnalysis(items);
    }
  }

  console.log(
    "[AI] Using intelligent fallback prioritization engine (GEMINI_API_KEY not configured)",
  );
  return generateFallbackAnalysis(items);
}

