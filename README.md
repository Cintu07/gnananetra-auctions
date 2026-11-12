# Gnananetra Auctions

Bank property auctions (houses, flats, plots, shops, commercial) gathered from other websites, kept fresh with no human involved, each card linking back to the original auction page. We do not run auctions: every bid happens on the source site.

Next.js 16, Cloudflare Workers, D1 (SQLite via Drizzle), Tailwind 4. Same brand colours and logo as the Gnananetra shop. Not deployed yet. Everything on the site comes from the real sources; there is no sample data.

## Before this goes public: get BAANKNET's written consent

The first source is **BAANKNET** (baanknet.com, the public sector banks' e-auction portal). It works technically: robots.txt allows it, and the site's own listing page loads its data from a public JSON endpoint that we read politely. But its Terms and Conditions (baanknet.com/terms-conditions) say its material is copyrighted and may not be reproduced, displayed or reused on another website for public or commercial purposes **without the Company's written consent**. A listing aggregator is exactly that. So:

- Ask BAANKNET for written permission (they gain bidders from it). Keep the email with the consent.
- Until then: keep `NEXT_PUBLIC_INDEXING` off (the default: search engines are told to stay away), do not publish the site, and do not copy their photos (they are hot-linked from their CDN, never stored).
- If they only allow part of it, reduce what is shown (for example no photos) in `lib/sync/adapters/baanknet.ts`.

## Run it

```bash
npm install
npm run db                 # creates the local D1 database (.wrangler/)
npm run dev -- --port 3001 # http://localhost:3001
npm run sync               # pulls every source now (the site must be running)
npm test                   # the 14 sync tests: no network, no database
```

`.env.local` needs `AUTH_SECRET` (32+ chars), `SYNC_SECRET`, `ADMIN_PASSWORD` (12+ chars) and, locally, `SYNC_URL=http://localhost:3001`. Admin: `/admin` (sync health, refresh buttons, click-outs).

`npm run check` runs the typecheck, the 14 sync tests (`npm test`, no network) and a production build.

## How the automatic updating works

`lib/sync/` is the engine. Each source in `lib/sync/sources.ts` has an adapter that turns the site into the same record (title, type, city, price, EMD, closing time, photo, link):

| adapter | reads | use when |
|---|---|---|
| `baanknet` | BAANKNET's own JSON (`POST /api/v1/auction/detail/auction-listing`, 250 per page) | BAANKNET |
| `jsonld` | schema.org JSON-LD the page embeds for Google | most stable generic option |
| `json` | the JSON a page loads in the background (Network tab), mapped by config | a site with a hidden JSON endpoint |
| `html` | plain pages read with CSS selectors | last resort |

**Adding a site** is one entry in `lib/sync/sources.ts`. No other code changes for `jsonld`, `json` and `html` sources. Templates:

```ts
// the page embeds schema.org JSON-LD
{ slug: "site-a", name: "Site A", homepage: "https://site-a.example", kind: "jsonld", enabled: true, config: { pages: ["https://site-a.example/auctions?page=1"] } },

// the page loads its results as JSON in the background (browser Network tab)
{ slug: "site-b", name: "Site B", homepage: "https://site-b.example", kind: "json", enabled: true, config: {
  url: "https://site-b.example/api/auctions?page={page}", maxPages: 5, itemsPath: "data.items",
  map: { externalId: "id", title: "title", price: "reserve_price", area: "area_text", city: "city", state: "state", auctionAt: "end_date", image: "photo", type: "category", emd: "emd" },
  urlTemplate: "https://site-b.example/auction/{id}" } },

// plain HTML read with CSS selectors ("selector@attr" reads an attribute)
{ slug: "site-c", name: "Site C", homepage: "https://site-c.example", kind: "html", enabled: true, config: {
  pages: ["https://site-c.example/auctions?page=1"], itemSelector: ".auction-card",
  fields: { title: "h3", url: "a@href", price: ".price", area: ".area", city: ".city", auctionAt: ".date", image: "img@src", emd: ".emd" } } },
```

On Cloudflare, a cron trigger (`wrangler.jsonc`, every 3 hours) calls the app's own `/api/sync` through `worker.ts`. Per run: fetch politely (honest user agent, robots.txt respected, a pause between requests), validate every record with zod, write only new or changed rows (a fingerprint per row), and mark listings that vanished from the source as ended. Safety nets: a source that suddenly returns almost nothing keeps its old data and is flagged "Looks broken" in the admin instead of wiping the site; auctions past their closing time end on their own.

## Rules

- Prices are whole rupees, areas square feet. Parsing helpers (`lib/parse.ts`) understand lakh, crore, acres, cents and gajam.
- No em or en dashes in anything visitors can read (`noDashes` runs on every scraped text).
- D1 takes 100 bound values per statement: bulk writes are chunked (`lib/sync/run.ts`).
- The Cloudflare account is shared with other live apps. Keep the Worker name `gnananetra-auctions`; never touch the others.
- Mobile first. Motion is CSS only and covered by the prefers-reduced-motion rule in `app/globals.css`.

## Deploy (when consent is in and the client says go)

Linux or WSL: `npm run cf:build`. Create D1 and R2 (names in `wrangler.jsonc`), put the ids in, `npx wrangler d1 migrations apply gnananetra-auctions --remote`, `npx wrangler secret put AUTH_SECRET / SYNC_SECRET / ADMIN_PASSWORD`, then deploy. Verified locally in workerd with `wrangler dev --test-scheduled`: the cron fired, found 8,502 auctions, saved them all, zero errors. The sync needs the Workers Paid plan (CPU time).
