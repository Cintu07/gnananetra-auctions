// Turning the messy text on listing sites into clean numbers. Pure functions, covered by scripts/test-sync.ts.

/** "₹1.2 Cr", "45 lakh", "Rs. 12,50,000", "2,500,000", "1.5 crore onwards" -> rupees. */
export function parsePriceInr(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) && Math.round(input) > 0 ? Math.round(input) : null;
  if (typeof input !== "string") return null;
  const s = input.toLowerCase().replace(/,/g, "");
  const m = s.match(/(\d+(?:\.\d+)?)\s*(crore|cr|lakhs?|lacs?|lac|l\b|thousand|k\b)?/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] ?? "";
  const mult = /^cr/.test(unit) ? 1e7 : /^(l|lac)/.test(unit) ? 1e5 : /^(thousand|k)/.test(unit) ? 1e3 : 1;
  const v = Math.round(n * mult);
  return v > 0 ? v : null;
}

const SQFT_PER: Record<string, number> = {
  "sq ft": 1, sqft: 1, "sq.ft": 1, "sq. ft": 1, "square feet": 1, "square foot": 1,
  "sq yd": 9, sqyd: 9, "sq.yd": 9, "sq. yd": 9, "square yards": 9, "sq yards": 9, gajam: 9, gaj: 9,
  "sq m": 10.7639, sqm: 10.7639, "square meter": 10.7639, "square metres": 10.7639, "sq mtr": 10.7639,
  acre: 43560, acres: 43560,
  cent: 435.6, cents: 435.6,
  guntha: 1089, gunta: 1089, guntas: 1089,
  bigha: 27000, // varies by state; the common north-Indian value, good enough for sorting
  ground: 2400, grounds: 2400, // Tamil Nadu
  marla: 272.25,
};

/** "2 acres", "240 sq yd", "1,800 sqft", "10 cents", "150 gajam" -> square feet. */
export function parseAreaSqft(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) && Math.round(input) > 0 ? Math.round(input) : null;
  if (typeof input !== "string") return null;
  const s = input.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");
  const m = s.match(/(\d+(?:\.\d+)?)\s*([a-z][a-z. ]*)?/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] ?? "").trim();
  let per = 1;
  if (unit) {
    const key = Object.keys(SQFT_PER)
      .sort((a, b) => b.length - a.length)
      .find((k) => unit.startsWith(k));
    if (!key) return null; // an unknown unit is better skipped than guessed
    per = SQFT_PER[key];
  }
  const v = Math.round(n * per);
  return v > 0 ? v : null;
}

/** Rupees to the way Indians read money: ₹45 L, ₹1.2 Cr. */
export function formatInr(v: number | null | undefined): string {
  if (!v) return "Price on request";
  if (v >= 1e7) return `₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `₹${trim(v / 1e5)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
}
const trim = (n: number) => (Math.round(n * 100) / 100).toString();

export function formatArea(sqft: number | null | undefined): string | null {
  if (!sqft) return null;
  if (sqft >= 43560) return `${trim(sqft / 43560)} acres`;
  return `${sqft.toLocaleString("en-IN")} sq ft`;
}

const TYPE_WORDS: [RegExp, string][] = [
  [/\b(agri|agricultur|farm|orchard|plantation|paddy)/i, "farm"],
  [/\b(shop|showroom|retail|store)\b/i, "shop"],
  [/\b(office|commercial|warehouse|godown|industrial|factory|building)\b/i, "commercial"],
  [/\b(flat|apartment|condo)\b/i, "flat"],
  [/\b(house|villa|bungalow|residence|home)\b/i, "house"],
  [/\b(plot|land|site|layout|acre|cent|gajam|sq\.? ?yd)/i, "land"],
];

/** Best guess of the property type from whatever words the source gave us. */
export function guessType(...texts: (string | null | undefined)[]): string {
  const hay = texts.filter(Boolean).join(" ");
  for (const [re, type] of TYPE_WORDS) if (re.test(hay)) return type;
  return "land";
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

/** No em or en dashes anywhere visitors can read (a house rule shared with the shop). */
export const noDashes = (s: string) => s.replace(/[–—]/g, "-");

export function cleanText(s: unknown, max = 400): string | null {
  if (typeof s !== "string") return null;
  const t = noDashes(s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim());
  return t ? t.slice(0, max) : null;
}
