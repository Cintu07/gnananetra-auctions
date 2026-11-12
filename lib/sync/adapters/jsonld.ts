import { parse } from "node-html-parser";
import { fromLoose, type Loose } from "@/lib/sync/normalize";
import type { Adapter } from "@/lib/sync/types";

// Many listing sites embed schema.org JSON-LD for Google. It is the most stable thing to read:
// it survives redesigns. config: { pages: string[] }

type Node = Record<string, unknown>;
const WANTED = /(RealEstateListing|Product|Offer|Residence|House|Apartment|Place|Accommodation|LandmarksOrHistoricalBuildings|Event|SingleFamilyResidence)/i;

function walk(n: unknown, out: Node[]) {
  if (Array.isArray(n)) return n.forEach((x) => walk(x, out));
  if (!n || typeof n !== "object") return;
  const o = n as Node;
  const t = [o["@type"]].flat().join(",");
  if (t && WANTED.test(t) && (o.name || o.headline)) out.push(o);
  for (const k of ["@graph", "itemListElement", "item", "mainEntity", "about"]) if (o[k]) walk(o[k], out);
}

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined);

export const jsonld: Adapter = async (source, fetcher) => {
  const pages = (source.config.pages as string[] | undefined) ?? [source.homepage];
  const items: Loose[] = [];
  for (const page of pages) {
    const res = await fetcher(page);
    if (!res.ok) throw new Error(`${page} answered ${res.status}`);
    const root = parse(await res.text());
    for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
      let data: unknown;
      try {
        data = JSON.parse(s.textContent);
      } catch {
        continue;
      }
      const nodes: Node[] = [];
      walk(data, nodes);
      for (const o of nodes) {
        const offer = (first(o.offers) ?? {}) as Node;
        const addr = (first(o.address) ?? first((o.location as Node | undefined)?.address) ?? {}) as Node;
        const floor = (o.floorSize ?? {}) as Node;
        items.push({
          externalId: str(o["@id"]) ?? str(o.sku) ?? str(o.url),
          url: str(o.url) ?? str(offer.url),
          title: str(o.name) ?? str(o.headline),
          description: str(o.description),
          image: str(first(o.image)) ?? str(((first(o.image) ?? {}) as Node).url),
          price: str(offer.price) ?? str(o.price),
          city: str(addr.addressLocality),
          state: str(addr.addressRegion),
          locality: str(addr.streetAddress),
          area: floor.value ? `${floor.value} ${str(floor.unitText) ?? "sq ft"}` : undefined,
          auctionAt: str(o.endDate) ?? str(offer.priceValidUntil) ?? str(o.startDate),
          type: str(o["@type"]),
        });
      }
    }
  }
  return items.map((l) => fromLoose(l, source.homepage));
};
