/**
 * Unified AI provider abstraction.
 * Supports Anthropic (native SDK) and OpenRouter (OpenAI-compatible).
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Rule } from "@/types";

type Provider = "anthropic" | "openrouter";

interface ProviderConfig {
  provider: Provider;
  apiKey: string;
  model?: string;
}

const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";
// Good default for OpenRouter: Claude via OpenRouter, falls back to GPT-4o if Claude unavailable
const OPENROUTER_DEFAULT_MODEL = "anthropic/claude-sonnet-4-5";

export async function extractRulesAI(
  config: ProviderConfig,
  imageDataUrls: string[],
  gameName: string
): Promise<Rule[]> {
  const systemPrompt = `You are a precise board game rules extractor. Read rulebook pages and extract EVERY rule — no matter how small. Never paraphrase in a way that loses meaning. Keep all numbers, exceptions, and edge cases intact.`;

  const userText = `These are pages from the rulebook of "${gameName}". Extract ALL rules visible on these pages.

Return a JSON array of rules. Each rule must have:
- "title": short name (3-6 words)
- "content": the full, precise rule text — do not omit any details, exceptions, or numbers
- "category": one of: "setup", "gameplay", "winning", "special", "components", "other"

Be exhaustive. Include every rule, sub-rule, and exception. Return ONLY the JSON array, no other text.`;

  let text: string;

  if (config.provider === "anthropic") {
    text = await extractWithAnthropic(config.apiKey, config.model ?? ANTHROPIC_DEFAULT_MODEL, imageDataUrls, systemPrompt, userText);
  } else {
    text = await extractWithOpenRouter(config.apiKey, config.model ?? OPENROUTER_DEFAULT_MODEL, imageDataUrls, systemPrompt, userText);
  }

  return parseRulesJSON(text);
}

export async function answerRulesAI(
  config: ProviderConfig,
  question: string,
  rules: Rule[],
  gameName: string
): Promise<string> {
  const rulesText = rules
    .map((r) => `[${r.category.toUpperCase()}] ${r.title}: ${r.content}`)
    .join("\n\n");

  const systemPrompt = `You are an expert board game rules judge for "${gameName}". Answer rules questions with precision, cite the specific rule that applies. If the answer isn't in the provided rules, say so clearly.`;
  const userMessage = `Here are the extracted rules for ${gameName}:\n\n${rulesText}\n\n---\n\nQuestion: ${question}`;

  if (config.provider === "anthropic") {
    const client = new Anthropic({ apiKey: config.apiKey });
    const response = await client.messages.create({
      model: config.model ?? ANTHROPIC_DEFAULT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  } else {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: { "HTTP-Referer": "https://rulebookai.app" },
    });
    const response = await client.chat.completions.create({
      model: config.model ?? OPENROUTER_DEFAULT_MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  }
}

async function extractWithAnthropic(
  apiKey: string,
  model: string,
  imageDataUrls: string[],
  systemPrompt: string,
  userText: string
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const imageContents = imageDataUrls.map((url) => {
    const [header, data] = url.split(",");
    const mediaType = header.split(":")[1].split(";")[0] as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";
    return {
      type: "image" as const,
      source: { type: "base64" as const, media_type: mediaType, data },
    };
  });

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [...imageContents, { type: "text", text: userText }],
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

async function extractWithOpenRouter(
  apiKey: string,
  model: string,
  imageDataUrls: string[],
  systemPrompt: string,
  userText: string
): Promise<string> {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: { "HTTP-Referer": "https://rulebookai.app" },
  });

  const imageContent = imageDataUrls.map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));

  const response = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [...imageContent, { type: "text", text: userText }],
      },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

function parseRulesJSON(text: string): Rule[] {
  let parsed: Omit<Rule, "id">[];
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Model did not return valid JSON rules");
    parsed = JSON.parse(match[0]);
  }
  return parsed.map((r, i) => ({ ...r, id: `rule-${Date.now()}-${i}` }));
}
