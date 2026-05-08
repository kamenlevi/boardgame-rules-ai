import { NextRequest, NextResponse } from "next/server";
import { answerRulesQuestion } from "@/lib/claude";
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

    const answer = await answerRulesQuestion(question, rules, gameName);
    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const maxDuration = 30;
