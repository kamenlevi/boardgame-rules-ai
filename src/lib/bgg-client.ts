/**
 * Client-side BGG XML API calls.
 *
 * BGG's XML API is blocked from server/datacenter IPs by Cloudflare bot detection,
 * but allows CORS (access-control-allow-origin: *) for real browsers.
 * These functions MUST run in the browser — never call them server-side.
 *
 * For BGG collection to work, the user's collection must be set to PUBLIC on BGG:
 * boardgamegeek.com → Profile → Settings → Privacy → make collection public.
 */

import { BGGGame } from "@/types";

const BGG_XML = "https://boardgamegeek.com/xmlapi2";

function parseXML(xml: string): Document {
  return new DOMParser().parseFromString(xml, "text/xml");
}

function tagText(doc: Document | Element, tag: string): string {
  return doc.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
}

function allByTag(doc: Document | Element, tag: string): Element[] {
  const list = doc.getElementsByTagName(tag);
  return Array.from({ length: list.length }, (_, i) => list[i] as Element);
}

async function bggFetch(url: string, retries = 4): Promise<Document> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url);

    if (res.status === 202) {
      // BGG queues large collection requests — wait and retry
      await new Promise((r) => setTimeout(r, 2500 + attempt * 1500));
      continue;
    }

    if (res.status === 401) {
      throw new BGGAuthError(
        "BGG returned 401 — your collection must be set to Public.\n" +
          "Go to boardgamegeek.com → top-right menu → Settings → Privacy → Collection: Everyone."
      );
    }

    if (!res.ok) {
      throw new Error(`BGG API error ${res.status}. Try again in a moment.`);
    }

    const xml = await res.text();
    const doc = parseXML(xml);

    // BGG sometimes returns an error message inside the XML
    const errorEl = doc.getElementsByTagName("error")[0];
    if (errorEl) {
      const msg = tagText(errorEl, "message");
      if (msg.toLowerCase().includes("invalid username")) {
        throw new Error(`BGG username "${url.match(/username=([^&]+)/)?.[1]}" not found.`);
      }
      throw new Error(`BGG error: ${msg}`);
    }

    return doc;
  }
  throw new Error("BGG request timed out. BGG may be slow — try again.");
}

export class BGGAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BGGAuthError";
  }
}

export async function bggFetchCollection(username: string, bggCookies?: string): Promise<BGGGame[]> {
  if (bggCookies) {
    return bggFetchCollectionAuthenticated(username, bggCookies);
  }

  const url = `${BGG_XML}/collection?username=${encodeURIComponent(username)}&own=1&stats=1&excludesubtype=boardgameexpansion`;
  const doc = await bggFetch(url);

  const items = allByTag(doc, "item");
  if (!items.length) return [];

  const ids = items
    .map((i) => i.getAttribute("objectid"))
    .filter(Boolean)
    .join(",");

  return bggFetchByIds(ids);
}

async function bggFetchCollectionAuthenticated(username: string, bggCookies: string): Promise<BGGGame[]> {
  const res = await fetch(
    `/api/bgg/collection?username=${encodeURIComponent(username)}`,
    { headers: { "x-bgg-cookies": bggCookies } }
  );

  if (res.status === 401) {
    throw new BGGAuthError(
      "BGG session expired. Please log in again with your BGG password."
    );
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Collection fetch failed" }));
    throw new Error(data.error ?? "Failed to fetch collection");
  }

  const data = await res.json();
  const doc = parseXML(data.xml);

  const items = allByTag(doc, "item");
  if (!items.length) return [];

  const ids = items
    .map((i) => i.getAttribute("objectid"))
    .filter(Boolean)
    .join(",");

  return bggFetchByIds(ids);
}

export async function bggFetchByIds(ids: string): Promise<BGGGame[]> {
  const url = `${BGG_XML}/thing?id=${ids}&stats=1`;
  const doc = await bggFetch(url);
  return allByTag(doc, "item").map(parseThing);
}

export async function bggFetchGame(id: string): Promise<BGGGame> {
  const games = await bggFetchByIds(id);
  if (!games.length) throw new Error("Game not found on BGG");
  return games[0];
}

export async function bggSearch(query: string): Promise<BGGGame[]> {
  const url = `${BGG_XML}/search?query=${encodeURIComponent(query)}&type=boardgame`;
  const doc = await bggFetch(url);
  const items = allByTag(doc, "item").slice(0, 15);
  if (!items.length) return [];

  const ids = items
    .map((i) => i.getAttribute("id"))
    .filter(Boolean)
    .join(",");
  return bggFetchByIds(ids);
}

function fixUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("//") ? `https:${url}` : url;
}

function parseThing(item: Element): BGGGame {
  const nameEls = allByTag(item, "name");
  const primaryName = nameEls.find((n) => n.getAttribute("type") === "primary");

  const categories = allByTag(item, "link")
    .filter((l) => l.getAttribute("type") === "boardgamecategory")
    .map((l) => l.getAttribute("value") ?? "");

  const mechanics = allByTag(item, "link")
    .filter((l) => l.getAttribute("type") === "boardgamemechanic")
    .map((l) => l.getAttribute("value") ?? "");

  const ratingsEl = allByTag(item, "ratings")[0];
  const avgRating = ratingsEl
    ? allByTag(ratingsEl, "average")[0]?.getAttribute("value")
    : "0";
  const avgWeight = ratingsEl
    ? allByTag(ratingsEl, "averageweight")[0]?.getAttribute("value")
    : "0";

  return {
    id: item.getAttribute("id") ?? "",
    name:
      primaryName?.getAttribute("value") ??
      nameEls[0]?.getAttribute("value") ??
      "",
    thumbnail: fixUrl(tagText(item, "thumbnail")),
    image: fixUrl(tagText(item, "image")),
    minPlayers: parseInt(
      allByTag(item, "minplayers")[0]?.getAttribute("value") ?? "0"
    ),
    maxPlayers: parseInt(
      allByTag(item, "maxplayers")[0]?.getAttribute("value") ?? "0"
    ),
    minPlaytime: parseInt(
      allByTag(item, "minplaytime")[0]?.getAttribute("value") ?? "0"
    ),
    maxPlaytime: parseInt(
      allByTag(item, "maxplaytime")[0]?.getAttribute("value") ?? "0"
    ),
    minAge: parseInt(
      allByTag(item, "minage")[0]?.getAttribute("value") ?? "0"
    ),
    yearPublished: parseInt(
      allByTag(item, "yearpublished")[0]?.getAttribute("value") ?? "0"
    ),
    rating: parseFloat(avgRating ?? "0"),
    weight: parseFloat(avgWeight ?? "0"),
    categories,
    mechanics,
    description: tagText(item, "description"),
  };
}
