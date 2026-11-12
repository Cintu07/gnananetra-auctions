import type { SourceDef } from "@/lib/sync/types";

// THE list of websites we gather listings from. Adding a source is adding one entry here and
// nothing else (the README shows a template for each kind). Pick the kind in this order, most
// to least stable:
//   jsonld  the page embeds schema.org JSON-LD for Google
//   json    the page loads its results as JSON in the background (see the browser's Network tab)
//   html    plain pages read with CSS selectors
// Check each site's terms and robots.txt first (the fetcher already respects robots.txt).

export const SOURCES: SourceDef[] = [
  {
    // The e-auction portal of the public sector banks. Reads the JSON its own listing page loads.
    slug: "baanknet",
    name: "BAANKNET",
    homepage: "https://baanknet.com",
    kind: "baanknet",
    enabled: true,
    intervalMin: 180,
    config: { limit: 250, maxPages: 60 },
  },
];
