import { NextRequest, NextResponse } from "next/server";
import { searchBGGGames } from "@/lib/bgg";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ games: [] });

  try {
    const games = await searchBGGGames(query);
    return NextResponse.json({ games });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
