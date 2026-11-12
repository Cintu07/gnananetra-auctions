import { cleanText, guessType, parseAreaSqft, parsePriceInr } from "@/lib/parse";
import { LISTING_TYPES } from "@/db/schema";

/** Loose strings (as found on a page or in a source's JSON) in, a candidate listing out. */
export type Loose = {
  externalId?: unknown;
  url?: unknown;
  title?: unknown;
  type?: unknown;
  state?: unknown;
  city?: unknown;
  locality?: unknown;
  area?: unknown;
  price?: unknown;
  emd?: unknown;
  auctionAt?: unknown;
  image?: unknown;
  description?: unknown;
};

export function absoluteUrl(href: unknown, base: string): string | null {
  if (typeof href !== "string" || !href.trim()) return null;
  try {
    const u = new URL(href.trim(), base);
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Dates arrive as ISO strings, "12 Dec 2026 11:00 AM", "12/12/2026" (day first) or epoch numbers. */
export function parseWhen(v: unknown): number | null {
  if (typeof v === "number") return v > 1e11 ? v : v > 1e9 ? v * 1000 : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\D+(\d{1,2}):(\d{2})\s*(am|pm)?)?/i);
  if (dmy) {
    let h = Number(dmy[4] ?? 0);
    if (dmy[6]?.toLowerCase() === "pm" && h < 12) h += 12;
    if (dmy[6]?.toLowerCase() === "am" && h === 12) h = 0;
    // sources are Indian: read the time as IST (UTC+5:30)
    return Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), h, Number(dmy[5] ?? 0)) - 19_800_000;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

export function fromLoose(l: Loose, base: string): Record<string, unknown> {
  const url = absoluteUrl(l.url, base);
  const title = cleanText(l.title, 300);
  const given = typeof l.type === "string" ? l.type : "";
  const type = (LISTING_TYPES as readonly string[]).includes(given) ? given : guessType(title, cleanText(l.description), given);
  return {
    externalId: String(l.externalId ?? url ?? ""),
    url,
    title,
    type,
    state: cleanText(l.state, 80),
    city: cleanText(l.city, 80),
    locality: cleanText(l.locality, 120),
    areaSqft: parseAreaSqft(l.area),
    price: parsePriceInr(l.price),
    emd: parsePriceInr(l.emd),
    auctionAt: parseWhen(l.auctionAt),
    image: absoluteUrl(l.image, base),
    description: cleanText(l.description, 1200),
  };
}

/** "a.b.c" lookups into JSON. */
export function pick(obj: unknown, path: string | undefined): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}
