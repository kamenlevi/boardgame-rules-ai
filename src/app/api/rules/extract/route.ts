import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Rule } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrls, gameName } = await req.json();

    if (!imageDataUrls?.length || !gameName) {
      return NextResponse.json(
        { error: "imageDataUrls and gameName required" },
        { status: 400 }
      );
    }

    if (imageDataUrls.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 images per request" },
        { status: 400 }
      );
    }

    // Use client-provided key, fall back to env
    const clientKey = req.headers.get("x-anthropic-key");
    const apiKey = clientKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No Anthropic API key configured. Add your key in Settings." },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    const imageContents = imageDataUrls.map((url: string) => {
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
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `You are a precise board game rules extractor. Read rulebook pages and extract EVERY rule — no matter how small or obvious. Be exhaustive and precise. Never paraphrase in a way that loses meaning. Keep all numbers, exceptions, and edge cases intact.`,
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
- "content": the full, precise rule text — do not omit any details, exceptions, or numbers
- "category": one of: "setup", "gameplay", "winning", "special", "components", "other"

Be exhaustive. Include every rule, sub-rule, and exception. Return ONLY the JSON array, no other text.`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: Omit<Rule, "id">[];
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Claude did not return valid JSON");
      parsed = JSON.parse(match[0]);
    }

    const rules: Rule[] = parsed.map((r, i) => ({
      ...r,
      id: `rule-${Date.now()}-${i}`,
    }));

    return NextResponse.json({ rules });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const maxDuration = 60;
