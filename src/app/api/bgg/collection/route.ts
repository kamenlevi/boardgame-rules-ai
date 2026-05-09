import { NextRequest, NextResponse } from "next/server";

const BGG_XML = "https://boardgamegeek.com/xmlapi2";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  const cookies = req.headers.get("x-bgg-cookies") ?? "";

  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const url = `${BGG_XML}/collection?username=${encodeURIComponent(username)}&own=1&stats=1&excludesubtype=boardgameexpansion`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        ...(cookies ? { Cookie: cookies } : {}),
      },
    });

    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 2500 + attempt * 1500));
      continue;
    }

    if (res.status === 401) {
      return NextResponse.json(
        { error: "Collection is private. Log in with your BGG password to access it." },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `BGG API error ${res.status}` },
        { status: 502 }
      );
    }

    const xml = await res.text();
    return NextResponse.json({ xml });
  }

  return NextResponse.json(
    { error: "BGG request timed out — try again" },
    { status: 504 }
  );
}
