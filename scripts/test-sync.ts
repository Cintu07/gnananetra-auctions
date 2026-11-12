// npm test: the sync engine's parsing and adapters, against fixtures (no network, no database).
import assert from "node:assert/strict";
import { formatArea, formatInr, guessType, parseAreaSqft, parsePriceInr } from "../lib/parse";
import { parseWhen } from "../lib/sync/normalize";
import { parseRobots, robotsAllows } from "../lib/sync/fetcher";
import { html } from "../lib/sync/adapters/html";
import { json } from "../lib/sync/adapters/json";
import { jsonld } from "../lib/sync/adapters/jsonld";
import { baanknet, mapType } from "../lib/sync/adapters/baanknet";
import { fingerprint } from "../lib/sync/run";
import { readFileSync } from "node:fs";
import { rawListing, type SourceDef } from "../lib/sync/types";

let failed = 0;
const t = (name: string, fn: () => void | Promise<void>) =>
  Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ok   ${name}`))
    .catch((e) => {
      failed += 1;
      console.log(`  FAIL ${name}\n       ${e.message}`);
    });

const src = (kind: SourceDef["kind"], config: SourceDef["config"]): SourceDef => ({ slug: "t", name: "T", homepage: "https://site.test", kind, enabled: true, config });
const page = (body: string, type = "text/html") => async () => new Response(body, { headers: { "content-type": type } });

await t("prices in lakh and crore", () => {
  assert.equal(parsePriceInr("₹1.2 Cr"), 12_000_000);
  assert.equal(parsePriceInr("45 Lakh"), 4_500_000);
  assert.equal(parsePriceInr("Rs. 12,50,000"), 1_250_000);
  assert.equal(parsePriceInr("2.5 crore onwards"), 25_000_000);
  assert.equal(parsePriceInr(3_200_000), 3_200_000);
  assert.equal(parsePriceInr("price on request"), null);
  assert.equal(parsePriceInr(0), null);
});

await t("areas in acres, cents, gajam, sq yd", () => {
  assert.equal(parseAreaSqft("1,800 sq ft"), 1800);
  assert.equal(parseAreaSqft("240 sq yd"), 2160);
  assert.equal(parseAreaSqft("2 acres"), 87_120);
  assert.equal(parseAreaSqft("10 cents"), 4356);
  assert.equal(parseAreaSqft("150 gajam"), 1350);
  assert.equal(parseAreaSqft("3 widgets"), null); // unknown unit: skipped, never guessed
  assert.equal(parseAreaSqft(0.4), null); // rounds to nothing: unknown, not an invalid zero
});

await t("money and area read the Indian way", () => {
  assert.equal(formatInr(4_500_000), "₹45 L");
  assert.equal(formatInr(12_000_000), "₹1.2 Cr");
  assert.equal(formatInr(null), "Price on request");
  assert.equal(formatArea(87_120), "2 acres");
  assert.equal(formatArea(2160), "2,160 sq ft");
});

await t("property type guessed from words", () => {
  assert.equal(guessType("Agricultural land with orchard"), "farm");
  assert.equal(guessType("Ground floor shop near bus stand"), "shop");
  assert.equal(guessType("3 BHK flat in Madhapur"), "flat");
  assert.equal(guessType("Open plot 240 sq yd"), "land");
});

await t("dates: IST, day first", () => {
  assert.equal(parseWhen("12/12/2026 11:00 AM"), Date.UTC(2026, 11, 12, 5, 30));
  assert.equal(parseWhen("2026-12-12T11:00:00+05:30"), Date.UTC(2026, 11, 12, 5, 30));
  assert.equal(parseWhen("not a date"), null);
});

await t("robots.txt is respected", () => {
  const r = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/public\n", "GnananetraAuctionsBot/1.0");
  assert.equal(robotsAllows(r, "/auctions"), true);
  assert.equal(robotsAllows(r, "/private/x"), false);
  assert.equal(robotsAllows(r, "/private/public/a"), true);
  const mine = parseRobots("User-agent: *\nDisallow:\nUser-agent: gnananetraauctionsbot\nDisallow: /\n", "GnananetraAuctionsBot/1.0");
  assert.equal(robotsAllows(mine, "/auctions"), false);
});

await t("html adapter reads cards with selectors", async () => {
  const body = `<div class="card"><h3>240 sq yd plot in Gajuwaka</h3><a href="/a/77">open</a><span class="price">₹45 Lakh</span><span class="area">240 sq yd</span><span class="city">Visakhapatnam</span><span class="date">12/12/2099 11:00 AM</span><img src="/p/77.jpg"></div>
  <div class="card"><h3>x</h3></div>`;
  const out = await html(src("html", { pages: ["https://site.test/list"], itemSelector: ".card", fields: { title: "h3", url: "a@href", price: ".price", area: ".area", city: ".city", auctionAt: ".date", image: "img@src" } }), page(body));
  const good = out.map((o) => rawListing.safeParse(o)).filter((p) => p.success);
  assert.equal(out.length, 2);
  assert.equal(good.length, 1); // the empty card is rejected by validation, not stored
  const l = good[0].success && good[0].data;
  assert.ok(l);
  assert.equal(l.url, "https://site.test/a/77");
  assert.equal(l.price, 4_500_000);
  assert.equal(l.areaSqft, 2160);
  assert.equal(l.image, "https://site.test/p/77.jpg");
  assert.equal(l.type, "land");
});

await t("json adapter maps a site's background JSON", async () => {
  const body = JSON.stringify({ data: { items: [{ id: 5, name: "Shop at MG Road", reserve_price: 3200000, area_text: "450 sq ft", city: "Guntur", end_date: "2099-01-01T10:00:00+05:30" }] } });
  const out = await json(src("json", { url: "https://site.test/api?page={page}", maxPages: 3, itemsPath: "data.items", map: { externalId: "id", title: "name", price: "reserve_price", area: "area_text", city: "city", auctionAt: "end_date" }, urlTemplate: "https://site.test/auction/{id}" }), page(body, "application/json"));
  assert.equal(out.length, 3); // the fixture answers every page, so 3 pages give 3 items
  const p = rawListing.parse(out[0]);
  assert.equal(p.url, "https://site.test/auction/5");
  assert.equal(p.type, "shop");
  assert.equal(p.price, 3_200_000);
});

await t("jsonld adapter reads schema.org markup", async () => {
  const ld = { "@context": "https://schema.org", "@graph": [{ "@type": "RealEstateListing", name: "2 acres agricultural land near Tenali", url: "https://site.test/l/9", offers: { price: "1.8 Cr" }, address: { addressLocality: "Tenali", addressRegion: "Andhra Pradesh" }, image: "https://site.test/i.jpg" }] };
  const out = await jsonld(src("jsonld", { pages: ["https://site.test/x"] }), page(`<html><script type="application/ld+json">${JSON.stringify(ld)}</script></html>`));
  assert.equal(out.length, 1);
  const p = rawListing.parse(out[0]);
  assert.equal(p.type, "farm");
  assert.equal(p.price, 18_000_000);
  assert.equal(p.city, "Tenali");
});

await t("junk links are rejected (javascript:, empty)", () => {
  assert.equal(rawListing.safeParse({ externalId: "1", url: "javascript:alert(1)", title: "bad one" }).success, false);
  assert.equal(rawListing.safeParse({ externalId: "1", url: "https://ok.test/1", title: "good one" }).success, true);
});

await t("baanknet: its own JSON becomes valid listings", async () => {
  const sample = readFileSync(new URL("./fixtures/baanknet-sample.json", import.meta.url), "utf8");
  const out = await baanknet(src("baanknet", { limit: 250 }), page(sample, "application/json"));
  assert.ok(out.length >= 5);
  for (const o of out) {
    const p = rawListing.safeParse(o);
    assert.ok(p.success, JSON.stringify(o));
    assert.match(p.data.url, /^https:\/\/baanknet\.com\/property-detail\/\d+\/[0-9a-f]{40}$/);
    assert.ok(p.data.price && p.data.price > 0);
    assert.ok(p.data.auctionAt && p.data.auctionAt > 1e12);
    assert.ok(p.data.bank);
  }
});

await t("baanknet: property types map onto ours", () => {
  assert.equal(mapType("Residential", "Individual House", ""), "house");
  assert.equal(mapType("Residential", "Flat", ""), "flat");
  assert.equal(mapType("Residential", "Plot", ""), "land");
  assert.equal(mapType("Commercial", "Shops", ""), "shop");
  assert.equal(mapType("Commercial", "Plot", ""), "land");
  assert.equal(mapType("Industrial", "Industrial Shed", ""), "commercial");
  assert.equal(mapType("Agricultural", "Agricultural Land", ""), "farm");
});

await t("baanknet: a changed response shape is reported, not swallowed", async () => {
  await assert.rejects(() => baanknet(src("baanknet", {}), page(JSON.stringify({ data: { items: [] } }), "application/json")), /changed its response/);
});

await t("fingerprint: same fields same print, any change a new one", () => {
  const base = { externalId: "1", url: "https://a.test/1", title: "A plot", type: "land" as const, price: 100 };
  assert.equal(fingerprint(rawListing.parse(base)), fingerprint(rawListing.parse({ ...base })));
  assert.notEqual(fingerprint(rawListing.parse(base)), fingerprint(rawListing.parse({ ...base, price: 101 })));
});

console.log(failed ? `\n${failed} FAILED` : "\nall tests passed");
process.exit(failed ? 1 : 0);
