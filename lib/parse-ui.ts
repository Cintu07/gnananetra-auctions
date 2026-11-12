// Small display helpers shared by pages and components (no server-only code, safe in the browser).

export const TYPE_LABEL: Record<string, string> = {
  land: "Plot / land",
  farm: "Agricultural land",
  shop: "Shop",
  commercial: "Commercial",
  house: "House",
  flat: "Flat",
};

export const TYPE_PLURAL: Record<string, string> = {
  land: "Plots and land",
  farm: "Agricultural land",
  shop: "Shops",
  commercial: "Commercial",
  house: "Houses",
  flat: "Flats",
};

/** "Ends in 2d 4h", "Ends in 3h 10m", "Ends in 12 min", or null once over. */
export function timeLeft(at: Date | number | null | undefined, now = Date.now()): { text: string; urgent: boolean; over: boolean } | null {
  if (!at) return null;
  const ms = (typeof at === "number" ? at : at.getTime()) - now;
  if (ms <= 0) return { text: "Auction over", urgent: false, over: true };
  const min = Math.floor(ms / 60_000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const text = d >= 1 ? `Ends in ${d}d ${h}h` : h >= 1 ? `Ends in ${h}h ${m}m` : `Ends in ${Math.max(1, m)} min`;
  return { text, urgent: ms < 24 * 3_600_000, over: false };
}

/** 12 Dec 2026, 11:00 am, always in India time whatever the visitor's clock says. */
export function auctionDate(at: Date | null | undefined): string | null {
  if (!at) return null;
  return (
    new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(at).replace(/\bam\b/i, "am").replace(/\bpm\b/i, "pm")
  );
}

export function pricePerSqft(price: number | null | undefined, sqft: number | null | undefined): string | null {
  if (!price || !sqft) return null;
  return `₹${Math.round(price / sqft).toLocaleString("en-IN")} per sq ft`;
}

export function ago(at: Date | null | undefined, now = Date.now()): string {
  if (!at) return "never";
  const min = Math.round((now - at.getTime()) / 60_000);
  if (min < 2) return "just now";
  if (min < 90) return `${min} min ago`;
  if (min < 36 * 60) return `${Math.round(min / 60)} h ago`;
  return `${Math.round(min / 1440)} days ago`;
}
