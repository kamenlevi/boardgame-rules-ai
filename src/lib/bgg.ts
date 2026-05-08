import { BGGGame } from "@/types";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DOMParser } = require("@xmldom/xmldom") as { DOMParser: new () => { parseFromString(xml: string, mime: string): XMLDocument } };

const BGG_API = "https://boardgamegeek.com/xmlapi2";

type XMLDoc = ReturnType<InstanceType<typeof DOMParser>["parseFromString"]>;

function parseXML(xml: string): XMLDoc {
  return new DOMParser().parseFromString(xml, "text/xml");
}

function getElementText(parent: XMLDoc | Element, tagName: string): string {
  return (parent as Element).getElementsByTagName(tagName)[0]?.textContent?.trim() ?? "";
}

function getAllByTag(parent: XMLDoc | Element, tagName: string): Element[] {
  const list = (parent as Element).getElementsByTagName(tagName);
  const result: Element[] = [];
  for (let i = 0; i < list.length; i++) result.push(list[i] as Element);
  return result;
}

export async function fetchBGGCollection(username: string): Promise<BGGGame[]> {
  const url = `${BGG_API}/collection?username=${encodeURIComponent(username)}&own=1&stats=1&excludesubtype=boardgameexpansion`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (res.status === 202) {
    await new Promise((r) => setTimeout(r, 3000));
    return fetchBGGCollection(username);
  }

  if (!res.ok) throw new Error(`BGG API error: ${res.status}`);

  const xml = await res.text();
  const doc = parseXML(xml);
  const items = getAllByTag(doc, "item");
  return items.map(parseBGGCollectionItem);
}

export async function fetchBGGGame(id: string): Promise<BGGGame> {
  const url = `${BGG_API}/thing?id=${id}&stats=1`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`BGG API error: ${res.status}`);
  const xml = await res.text();
  const doc = parseXML(xml);
  const items = getAllByTag(doc, "item");
  if (!items.length) throw new Error("Game not found");
  return parseBGGThing(items[0]);
}

export async function searchBGGGames(query: string): Promise<BGGGame[]> {
  const url = `${BGG_API}/search?query=${encodeURIComponent(query)}&type=boardgame`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BGG search error: ${res.status}`);
  const xml = await res.text();
  const doc = parseXML(xml);
  const items = getAllByTag(doc, "item").slice(0, 10);

  const ids = items.map((i) => i.getAttribute("id")).filter(Boolean).join(",");
  if (!ids) return [];

  const detailUrl = `${BGG_API}/thing?id=${ids}&stats=1`;
  const detailRes = await fetch(detailUrl);
  if (!detailRes.ok) return [];
  const detailXml = await detailRes.text();
  const detailDoc = parseXML(detailXml);

  return getAllByTag(detailDoc, "item").map(parseBGGThing);
}

function parseBGGCollectionItem(item: Element): BGGGame {
  const statsEl = getAllByTag(item, "stats")[0];
  const ratingEl = getAllByTag(item, "average")[0];

  return {
    id: item.getAttribute("objectid") ?? "",
    name: getElementText(item, "name"),
    thumbnail: getElementText(item, "thumbnail"),
    image: getElementText(item, "image"),
    minPlayers: parseInt(statsEl?.getAttribute("minplayers") ?? "0"),
    maxPlayers: parseInt(statsEl?.getAttribute("maxplayers") ?? "0"),
    minPlaytime: parseInt(statsEl?.getAttribute("minplaytime") ?? "0"),
    maxPlaytime: parseInt(statsEl?.getAttribute("maxplaytime") ?? "0"),
    minAge: parseInt(statsEl?.getAttribute("minage") ?? "0"),
    yearPublished: parseInt(getElementText(item, "yearpublished")),
    rating: parseFloat(ratingEl?.getAttribute("value") ?? "0"),
    weight: 0,
    categories: [],
    mechanics: [],
    description: "",
  };
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

  const statsEl = getAllByTag(item, "statistics")[0];
  const ratingsEl = statsEl ? getAllByTag(statsEl, "ratings")[0] : null;
  const avgRating = ratingsEl ? getAllByTag(ratingsEl, "average")[0]?.getAttribute("value") : "0";
  const avgWeight = ratingsEl ? getAllByTag(ratingsEl, "averageweight")[0]?.getAttribute("value") : "0";

  return {
    id: item.getAttribute("id") ?? "",
    name: primaryName?.getAttribute("value") ?? nameEls[0]?.getAttribute("value") ?? "",
    thumbnail: getElementText(item, "thumbnail"),
    image: getElementText(item, "image"),
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
