import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Rule } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { question, rules, gameName } = await req.json() as {
      question: string;
      rules: Rule[];
      gameName: string;
    };

    if (!question || !rules?.length || !gameName) {
      return NextResponse.json(
        { error: "question, rules, and gameName required" },
        { status: 400 }
      );
    }

    const clientKey = req.headers.get("x-anthropic-key");
    const apiKey = clientKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No Anthropic API key configured. Add your key in Settings." },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    const rulesText = rules
      .map((r) => `[${r.category.toUpperCase()}] ${r.title}: ${r.content}`)
      .join("\n\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are an expert board game rules judge for "${gameName}". Answer rules questions with precision and cite the specific rule that applies. If the answer isn't in the provided rules, say so clearly rather than guessing.`,
      messages: [
        {
          role: "user",
          content: `Here are the extracted rules for ${gameName}:\n\n${rulesText}\n\n---\n\nQuestion: ${question}`,
        },
      ],
    });

    const answer = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const maxDuration = 30;
