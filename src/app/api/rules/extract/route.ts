import { NextRequest, NextResponse } from "next/server";
import { extractRulesAI } from "@/lib/ai-provider";
import { AIProvider } from "@/types";

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

    const rules = await extractRulesAI(
      { provider, apiKey, model },
      imageDataUrls,
      gameName
    );

    return NextResponse.json({ rules });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const maxDuration = 60;
