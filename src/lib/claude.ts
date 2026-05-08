import Anthropic from "@anthropic-ai/sdk";
import { Rule } from "@/types";

const client = new Anthropic();

export async function extractRulesFromImages(
  imageUrls: string[],
  gameName: string
): Promise<Rule[]> {
  const imageContents = await Promise.all(
    imageUrls.map(async (url) => {
      // If it's a base64 data URL, parse it directly
      if (url.startsWith("data:")) {
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
      }
      // Otherwise fetch and convert
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: contentType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: base64,
        },
      };
    })
  );

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `You are a precise board game rules extractor. Your job is to read rulebook pages and extract EVERY rule written on them — no matter how small or obvious. Be exhaustive and precise. Never paraphrase in a way that loses meaning. Keep all numbers, exceptions, and edge cases intact.`,
    messages: [
      {
        role: "user",
        content: [
          ...imageContents,
          {
            type: "text",
            text: `These are pages from the rulebook of "${gameName}". Extract ALL rules visible on these pages.

Return a JSON array of rules. Each rule must have:
- "title": short name for the rule (3-6 words)
- "content": the full, precise rule text — do not omit any details
- "category": one of: "setup", "gameplay", "winning", "special", "components", "other"

Be exhaustive. If a rule has sub-rules or exceptions, include them in the content field. Do not skip anything.

Return ONLY the JSON array, no other text.`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text.trim());
    return parsed.map((r: Omit<Rule, "id">, i: number) => ({
      ...r,
      id: `rule-${Date.now()}-${i}`,
    }));
  } catch {
    // Try to extract JSON from the response if it has surrounding text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.map((r: Omit<Rule, "id">, i: number) => ({
        ...r,
        id: `rule-${Date.now()}-${i}`,
      }));
    }
    throw new Error("Failed to parse rules from Claude response");
  }
}

export async function answerRulesQuestion(
  question: string,
  rules: Rule[],
  gameName: string
): Promise<string> {
  const rulesText = rules
    .map((r) => `[${r.category.toUpperCase()}] ${r.title}: ${r.content}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `You are an expert board game rules judge for "${gameName}". You answer rules questions with precision and cite the specific rule that applies. If the answer isn't in the provided rules, say so clearly.`,
    messages: [
      {
        role: "user",
        content: `Here are the extracted rules for ${gameName}:\n\n${rulesText}\n\n---\n\nQuestion: ${question}`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
