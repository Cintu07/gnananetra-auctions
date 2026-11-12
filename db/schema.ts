import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Cloudflare D1 (SQLite). Times are milliseconds since 1970 and come back as Date objects.
// Prices are whole rupees (integers); areas are square feet (the sync engine converts acres, cents, gajam...).

const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const nowMs = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

export const LISTING_TYPES = ["land", "shop", "house", "flat", "commercial", "farm"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];
export type ListingStatus = "upcoming" | "live" | "ended";

/** One website we gather listings from. Rows are created from lib/sync/sources.ts on every run. */
export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  homepage: text("homepage").notNull(),
  kind: text("kind").notNull(), // baanknet | jsonld | json | html
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  intervalMin: integer("interval_min").notNull().default(180),
  lastRunAt: ts("last_run_at"),
  lastOkAt: ts("last_ok_at"),
  lastStatus: text("last_status"), // ok | empty | error
  lastError: text("last_error"),
  lastCount: integer("last_count").notNull().default(0),
});

export const listings = sqliteTable(
  "listings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(), // the source's own id, or a hash of its url
    url: text("url").notNull(), // the original listing: where "View on source" goes
    title: text("title").notNull(),
    type: text("type").notNull().default("land"),
    state: text("state"),
    city: text("city"),
    locality: text("locality"),
    areaSqft: integer("area_sqft"),
    price: integer("price"), // reserve / starting price, rupees
    emd: integer("emd"), // earnest money deposit, rupees
    auctionAt: ts("auction_at"), // when bidding closes (or opens, for upcoming)
    status: text("status").notNull().default("live"), // upcoming | live | ended
    bank: text("bank"), // the lender or seller that is auctioning it
    image: text("image"),
    description: text("description"),
    firstSeenAt: ts("first_seen_at").notNull().default(nowMs),
    lastSeenAt: ts("last_seen_at").notNull().default(nowMs),
    updatedAt: ts("updated_at").notNull().default(nowMs),
    endedAt: ts("ended_at"),
    clicks: integer("clicks").notNull().default(0),
    // fingerprint of the source fields: a run only writes rows whose fingerprint changed
    hash: text("hash"),
  },
  (t) => [
    uniqueIndex("listings_source_ext_key").on(t.sourceId, t.externalId),
    index("listings_status_idx").on(t.status, t.auctionAt),
    index("listings_type_idx").on(t.type),
    index("listings_city_idx").on(t.city),
    index("listings_price_idx").on(t.price),
    index("listings_bank_idx").on(t.bank),
  ],
);

/** One row per sync run per source: the health history shown in the admin. */
export const syncRuns = sqliteTable(
  "sync_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    startedAt: ts("started_at").notNull().default(nowMs),
    finishedAt: ts("finished_at"),
    found: integer("found").notNull().default(0),
    added: integer("added").notNull().default(0),
    updated: integer("updated").notNull().default(0),
    ended: integer("ended").notNull().default(0),
    status: text("status").notNull().default("running"), // running | ok | empty | error
    error: text("error"),
  },
  (t) => [index("sync_runs_source_idx").on(t.sourceId, t.startedAt)],
);
