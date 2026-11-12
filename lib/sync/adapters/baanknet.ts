import { createHash } from "node:crypto";
import { cleanText, parseAreaSqft } from "@/lib/parse";
import { absoluteUrl, parseWhen } from "@/lib/sync/normalize";
import type { Adapter } from "@/lib/sync/types";

// BAANKNET (baanknet.com): the e-auction portal of the public sector banks. Its listing page is a
// single-page app that loads every auction as JSON from its own public endpoint; we read the same
// JSON, politely: robots.txt allows it, 250 records per request, a pause between requests.
//
//   POST https://baanknet.com/api/v1/auction/detail/auction-listing   { "page": 1, "limit": 250 }
//   -> { data: { data: [{ _source: {...} }], total, currentPage, totalPages } }
//
// config: { limit?: number (default 250), maxPages?: number (default 60) }

const ENDPOINT = "https://baanknet.com/api/v1/auction/detail/auction-listing";
const SITE = "https://baanknet.com";

/** Their detail pages only open with the page's own SHA-1 appended (/property-detail/{id}/{sha1 of that path}). */
function detailUrl(propertyDetailId: number): string {
  const path = `/property-detail/${propertyDetailId}`;
  return `${SITE}${path}/${createHash("sha1").update(path).digest("hex")}`;
}

type Media = { url?: string; filetype?: number; ismainimage?: string | number };
type Src = Record<string, unknown> & { propertyMedia?: Media[] };

/** Their (type, sub type) pairs onto ours. Bank auctions are mostly houses, flats and commercial. */
export function mapType(propertyType: unknown, sub: unknown, heading: unknown): string {
  const t = `${propertyType ?? ""} ${sub ?? ""} ${heading ?? ""}`.toLowerCase();
  if (/agri|farm|orchard|plantation/.test(t)) return "farm";
  if (/\bshop|showroom/.test(t)) return "shop";
  if (/\bflat|apartment/.test(t)) return "flat";
  if (/individual house|\bhouse|villa|bungalow|rural house/.test(t)) return "house";
  if (/plot|land|site/.test(String(sub ?? "").toLowerCase())) return "land";
  if (/industrial|office|commercial|shed|factory|warehouse|building|hotel|hospital/.test(t)) return "commercial";
  if (/plot|land/.test(t)) return "land";
  return "land";
}

function mainImage(media: Media[] | undefined): string | null {
  const pics = (media ?? []).filter((m) => m.url && (m.filetype === 1 || /\.(jpe?g|png|webp)(\?|$)/i.test(m.url)));
  const main = pics.find((m) => String(m.ismainimage) === "1") ?? pics[0];
  return main?.url ? absoluteUrl(main.url, SITE) : null;
}

export function fromBaanknet(src: Src): Record<string, unknown> | null {
  const id = src.auctionId;
  // their own site opens a card at /property-detail/{propertyDetailId}/{token} (not the auction id)
  const pid = Number(src.propertyDetailId);
  if (id == null) return null;
  const heading = cleanText(src.propertyHeading, 300);
  const bank = cleanText(src.propertyBankName, 120);
  const sub = cleanText(src.propertySubType, 60);
  const bits = [
    cleanText(src.address, 600),
    sub && `Type: ${sub}.`,
    bank && `Bank: ${bank}.`,
    cleanText(src.typeOfAction, 60) && `Auction under: ${cleanText(src.typeOfAction, 60)}.`,
    cleanText(src.propertyPossessionType, 40) && `Possession: ${cleanText(src.propertyPossessionType, 40)}.`,
  ].filter(Boolean);
  return {
    externalId: String(id),
    url: Number.isInteger(pid) && pid > 0 ? detailUrl(pid) : `${SITE}/property-listing`,
    title: heading,
    type: mapType(src.propertyType, src.propertySubType, heading),
    state: cleanText(src.stateName, 80),
    city: cleanText(src.cityName, 80) ?? cleanText(src.districtName, 80),
    locality: cleanText(src.locality, 120),
    bank,
    areaSqft: parseAreaSqft(Number(src.carpetAreaSqft) || Number(src.builtupAreaSqft) || null),
    price: Number(src.reservePrice) > 0 ? Math.round(Number(src.reservePrice)) : null,
    emd: Number(src.emd) > 0 ? Math.round(Number(src.emd)) : null,
    // bidding closes at the extended time when the auction was extended
    auctionAt: parseWhen(String(src.auctionExtendedTo ?? src.auctionTo ?? "")),
    image: mainImage(src.propertyMedia),
    description: bits.join(" ").slice(0, 1200) || null,
  };
}

export const baanknet: Adapter = async (source, fetcher) => {
  const limit = Math.min(Number(source.config.limit) || 250, 500);
  const maxPages = Math.min(Number(source.config.maxPages) || 60, 200);
  const out: Record<string, unknown>[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetcher(ENDPOINT, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ page, limit }) });
    if (!res.ok) throw new Error(`baanknet page ${page} answered ${res.status}`);
    const body = (await res.json()) as { data?: { data?: { _source?: Src }[]; totalPages?: number } };
    const rows = body.data?.data;
    if (!Array.isArray(rows)) throw new Error("baanknet changed its response: no data.data list (the adapter needs updating)");
    for (const r of rows) {
      const item = r._source ? fromBaanknet(r._source) : null;
      if (item) out.push(item);
    }
    if (!rows.length || page >= (body.data?.totalPages ?? page)) break;
  }
  return out;
};
