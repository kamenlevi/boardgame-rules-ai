/**
 * Server-side game detail lookup using api.geekdo.com/api/geekitems
 * This endpoint works from the server (not blocked by Cloudflare).
 * Used as fallback when the client-side BGG XML API can't run (e.g. SSR).
 */
import { NextRequest, NextResponse } from "next/server";
import { BGGGame } from "@/types";

const GEEKDO = "https://api.geekdo.com/api/geekitems";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const res = await fetch(
      `${GEEKDO}?objecttype=thing&objectid=${encodeURIComponent(id)}&nosession=1`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 86400 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `BGG returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const item = data?.item;
    if (!item) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const images = item.images ?? {};
    const game: BGGGame = {
      id: String(item.objectid ?? id),
      name: item.name ?? "",
      thumbnail: images.thumb ?? images.square200 ?? "",
      image: images.original ?? images.thumb ?? "",
      minPlayers: parseInt(item.minplayers ?? "0"),
      maxPlayers: parseInt(item.maxplayers ?? "0"),
      minPlaytime: parseInt(item.minplaytime ?? "0"),
      maxPlaytime: parseInt(item.maxplaytime ?? "0"),
      minAge: parseInt(item.minage ?? "0"),
      yearPublished: parseInt(item.yearpublished ?? "0"),
      rating: 0,
      weight: 0,
      categories:
        item.links?.boardgamecategory?.map((c: { name: string }) => c.name) ?? [],
      mechanics:
        item.links?.boardgamemechanic?.map((m: { name: string }) => m.name) ?? [],
      description: item.short_description ?? "",
    };

    return NextResponse.json({ game });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
