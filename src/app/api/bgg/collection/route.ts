import { NextRequest, NextResponse } from "next/server";
import { fetchBGGCollection } from "@/lib/bgg";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  try {
    const games = await fetchBGGCollection(username);
    return NextResponse.json({ games });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
