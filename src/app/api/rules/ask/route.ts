import { NextRequest, NextResponse } from "next/server";
import { answerRulesAI } from "@/lib/ai-provider";
import { Rule, AIProvider } from "@/types";

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

    const clientKey = req.headers.get("x-api-key");
    const provider = (req.headers.get("x-provider") ?? "anthropic") as AIProvider;
    const model = req.headers.get("x-model") ?? undefined;

    const apiKey = clientKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key configured. Add your key in Settings ⚙." },
        { status: 400 }
      );
    }

    const answer = await answerRulesAI(
      { provider, apiKey, model },
      question,
      rules,
      gameName
    );

    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const maxDuration = 30;
