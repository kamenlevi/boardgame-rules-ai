import { NextRequest, NextResponse } from "next/server";
import { extractRulesFromImages } from "@/lib/claude";

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

    const rules = await extractRulesFromImages(imageDataUrls, gameName);
    return NextResponse.json({ rules });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const maxDuration = 60;
