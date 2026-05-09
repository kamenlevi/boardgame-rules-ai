import { NextRequest, NextResponse } from "next/server";

export interface BGGFile {
  id: string;
  name: string;
  url: string;
  size: number;
  filetype: string;
}

export async function GET(req: NextRequest) {
  const gameId = req.nextUrl.searchParams.get("gameId");
  if (!gameId) {
    return NextResponse.json({ error: "gameId required" }, { status: 400 });
  }

  try {
    // BGG geekdo API endpoint for game files
    const res = await fetch(
      `https://api.geekdo.com/api/files?objectid=${encodeURIComponent(gameId)}&objecttype=thing&nosession=1&sort=hot`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `BGG files API returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const files: BGGFile[] = (data?.files ?? [])
      .filter((f: Record<string, unknown>) => {
        const name = String(f.filename ?? f.name ?? "").toLowerCase();
        const category = String(f.filecategory ?? f.category ?? "").toLowerCase();
        return (
          category.includes("rule") ||
          name.includes("rule") ||
          name.includes("rulebook") ||
          name.includes("manual") ||
          name.includes("instruction")
        );
      })
      .map((f: Record<string, unknown>) => ({
        id: String(f.fileid ?? f.id ?? ""),
        name: String(f.filename ?? f.name ?? "Unknown"),
        url: String(f.fileurl ?? f.url ?? ""),
        size: Number(f.filesize ?? f.size ?? 0),
        filetype: String(f.filetype ?? ""),
      }));

    return NextResponse.json({ files });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
