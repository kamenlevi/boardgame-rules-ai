/**
 * Client-side BGG API calls. Must run in the browser — BGG blocks server-side
 * requests from datacenter IPs but allows CORS * for browser requests.
 */
import { BGGGame } from "@/types";

const BGG_API = "https://boardgamegeek.com/xmlapi2";

function getAllByTag(parent: Element | Document, tagName: string): Element[] {
  const list = parent.getElementsByTagName(tagName);
  const result: Element[] = [];
  for (let i = 0; i < list.length; i++) result.push(list[i] as Element);
  return result;
}

function getElementText(parent: Element | Document, tagName: string): string {
  return parent.getElementsByTagName(tagName)[0]?.textContent?.trim() ?? "";
}

async function fetchXML(url: string, retries = 3): Promise<Document> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url);

    if (res.status === 202) {
      // BGG queues the request — wait and retry
      await new Promise((r) => setTimeout(r, 2000 + attempt * 1000));
      continue;
    }

    if (!res.ok) throw new Error(`BGG returned ${res.status}`);

    const xml = await res.text();
    return new DOMParser().parseFromString(xml, "text/xml");
  }
  throw new Error("BGG request timed out after retries");
}

export async function bggFetchCollection(username: string): Promise<BGGGame[]> {
  const url = `${BGG_API}/collection?username=${encodeURIComponent(username)}&own=1&stats=1&excludesubtype=boardgameexpansion`;
  const doc = await fetchXML(url);

  const error = getElementText(doc, "error");
  if (error) throw new Error(error);

  const items = getAllByTag(doc, "item");
  if (!items.length) return [];

  // Collection items don't have full detail — batch fetch them
  const ids = items.map((i) => i.getAttribute("objectid")).filter(Boolean).join(",");
  return bggFetchThings(ids);
}

export async function bggFetchThings(ids: string): Promise<BGGGame[]> {
  const url = `${BGG_API}/thing?id=${ids}&stats=1`;
  const doc = await fetchXML(url);
  return getAllByTag(doc, "item").map(parseBGGThing);
}

export async function bggFetchGame(id: string): Promise<BGGGame> {
  const games = await bggFetchThings(id);
  if (!games.length) throw new Error("Game not found");
  return games[0];
}

export async function bggSearch(query: string): Promise<BGGGame[]> {
  const searchUrl = `${BGG_API}/search?query=${encodeURIComponent(query)}&type=boardgame`;
  const doc = await fetchXML(searchUrl);
  const items = getAllByTag(doc, "item").slice(0, 15);
  if (!items.length) return [];

  const ids = items.map((i) => i.getAttribute("id")).filter(Boolean).join(",");
  return bggFetchThings(ids);
}

export async function bggFetchRulebookUrl(gameId: string): Promise<string | null> {
  // BGG hosts rulebook files in the game's files section
  const url = `${BGG_API}/thing?id=${gameId}&versions=1`;
  const doc = await fetchXML(url);
  const description = getElementText(doc, "description");
  const match = description.match(/https?:\/\/[^\s"<>]+\.pdf/i);
  return match ? match[0] : null;
}

function parseBGGThing(item: Element): BGGGame {
  const nameEls = getAllByTag(item, "name");
  const primaryName = nameEls.find((n) => n.getAttribute("type") === "primary");

  const categories = getAllByTag(item, "link")
    .filter((l) => l.getAttribute("type") === "boardgamecategory")
    .map((l) => l.getAttribute("value") ?? "");

  const mechanics = getAllByTag(item, "link")
    .filter((l) => l.getAttribute("type") === "boardgamemechanic")
    .map((l) => l.getAttribute("value") ?? "");

  const ratingsEl = getAllByTag(item, "ratings")[0];
  const avgRating = ratingsEl
    ? getAllByTag(ratingsEl, "average")[0]?.getAttribute("value")
    : "0";
  const avgWeight = ratingsEl
    ? getAllByTag(ratingsEl, "averageweight")[0]?.getAttribute("value")
    : "0";

  const thumbnail = getElementText(item, "thumbnail");
  const image = getElementText(item, "image");

  return {
    id: item.getAttribute("id") ?? "",
    name: primaryName?.getAttribute("value") ?? nameEls[0]?.getAttribute("value") ?? "",
    thumbnail: thumbnail.startsWith("//") ? `https:${thumbnail}` : thumbnail,
    image: image.startsWith("//") ? `https:${image}` : image,
    minPlayers: parseInt(getAllByTag(item, "minplayers")[0]?.getAttribute("value") ?? "0"),
    maxPlayers: parseInt(getAllByTag(item, "maxplayers")[0]?.getAttribute("value") ?? "0"),
    minPlaytime: parseInt(getAllByTag(item, "minplaytime")[0]?.getAttribute("value") ?? "0"),
    maxPlaytime: parseInt(getAllByTag(item, "maxplaytime")[0]?.getAttribute("value") ?? "0"),
    minAge: parseInt(getAllByTag(item, "minage")[0]?.getAttribute("value") ?? "0"),
    yearPublished: parseInt(getAllByTag(item, "yearpublished")[0]?.getAttribute("value") ?? "0"),
    rating: parseFloat(avgRating ?? "0"),
    weight: parseFloat(avgWeight ?? "0"),
    categories,
    mechanics,
    description: getElementText(item, "description"),
  };
}
