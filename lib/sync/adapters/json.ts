import { fromLoose, pick, type Loose } from "@/lib/sync/normalize";
import type { Adapter } from "@/lib/sync/types";

// Reads the JSON a site's own pages load in the background (see the Network tab of any listing site).
// config: {
//   url: "https://site/api/auctions?page={page}",   {page} starts at 1
//   maxPages: 5,
//   itemsPath: "data.items",
//   map: { externalId: "id", title: "name", price: "reserve_price", area: "area_text", city: "city",
//          state: "state", auctionAt: "end_date", image: "photo", type: "category", emd: "emd" },
//   urlTemplate: "https://site/auction/{id}"   (or map.url when each item carries its own link)
// }

export const json: Adapter = async (source, fetcher) => {
  const c = source.config as { url: string; maxPages?: number; itemsPath?: string; map: Record<string, string>; urlTemplate?: string };
  if (!c.url || !c.map) throw new Error("json source needs `url` and `map`");
  const out: Record<string, unknown>[] = [];
  const pages = Math.min(c.maxPages ?? 1, 20);
  for (let page = 1; page <= pages; page++) {
    const res = await fetcher(c.url.replace("{page}", String(page)), { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`page ${page} answered ${res.status}`);
    const body: unknown = await res.json();
    const items = c.itemsPath ? pick(body, c.itemsPath) : body;
    if (!Array.isArray(items) || !items.length) break;
    for (const it of items) {
      const l: Loose = {};
      for (const [field, path] of Object.entries(c.map)) (l as Record<string, unknown>)[field] = pick(it, path);
      if (!l.url && c.urlTemplate) l.url = c.urlTemplate.replace(/\{(\w+)\}/g, (_, k: string) => String(pick(it, c.map[k] ?? k) ?? ""));
      out.push(fromLoose(l, source.homepage));
    }
  }
  return out;
};
