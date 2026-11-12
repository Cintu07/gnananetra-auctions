import "server-only";
import { and, asc, count, desc, eq, gte, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { LISTING_TYPES } from "@/db/schema";

export const PER_PAGE = 24;

export type SortKey = "closing" | "newest" | "price-asc" | "price-desc";
export type Search = { q?: string; type?: string; city?: string; bank?: string; min?: number; max?: number; status?: "live" | "ended"; sort?: SortKey; page?: number };

const card = {
  id: s.listings.id,
  title: s.listings.title,
  type: s.listings.type,
  city: s.listings.city,
  state: s.listings.state,
  locality: s.listings.locality,
  bank: s.listings.bank,
  areaSqft: s.listings.areaSqft,
  price: s.listings.price,
  emd: s.listings.emd,
  auctionAt: s.listings.auctionAt,
  status: s.listings.status,
  image: s.listings.image,
  firstSeenAt: s.listings.firstSeenAt,
  sourceName: s.sources.name,
};
export type Card = {
  id: number;
  title: string;
  type: string;
  city: string | null;
  state: string | null;
  locality: string | null;
  bank: string | null;
  areaSqft: number | null;
  price: number | null;
  emd: number | null;
  auctionAt: Date | null;
  status: string;
  image: string | null;
  firstSeenAt: Date;
  sourceName: string;
};

const base = () => db.select(card).from(s.listings).innerJoin(s.sources, eq(s.sources.id, s.listings.sourceId));

function where(f: Search): SQL | undefined {
  const w: (SQL | undefined)[] = [eq(s.sources.enabled, true)];
  w.push(f.status === "ended" ? eq(s.listings.status, "ended") : ne(s.listings.status, "ended"));
  if (f.type && (LISTING_TYPES as readonly string[]).includes(f.type)) w.push(eq(s.listings.type, f.type));
  if (f.city) w.push(eq(s.listings.city, f.city));
  if (f.bank) w.push(eq(s.listings.bank, f.bank));
  if (f.min) w.push(gte(s.listings.price, f.min));
  if (f.max) w.push(lte(s.listings.price, f.max));
  const q = f.q?.trim().slice(0, 80);
  if (q) {
    const like_ = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    w.push(or(sql`${s.listings.title} like ${like_} escape '\\'`, sql`${s.listings.city} like ${like_} escape '\\'`, sql`${s.listings.locality} like ${like_} escape '\\'`, sql`${s.listings.state} like ${like_} escape '\\'`, sql`${s.listings.bank} like ${like_} escape '\\'`));
  }
  return and(...w);
}

export async function searchListings(f: Search) {
  const page = Math.max(1, f.page ?? 1);
  const order = {
    closing: [sql`${s.listings.auctionAt} is null`, asc(s.listings.auctionAt)],
    newest: [desc(s.listings.firstSeenAt)],
    "price-asc": [sql`${s.listings.price} is null`, asc(s.listings.price)],
    "price-desc": [sql`${s.listings.price} is null`, desc(s.listings.price)],
  }[f.sort ?? (f.status === "ended" ? "newest" : "closing")];
  const [{ n }] = await db.select({ n: count() }).from(s.listings).innerJoin(s.sources, eq(s.sources.id, s.listings.sourceId)).where(where(f));
  const rows = (await base()
    .where(where(f))
    .orderBy(...order)
    .limit(PER_PAGE)
    .offset((page - 1) * PER_PAGE)) as Card[];
  return { rows, total: n, page, pages: Math.max(1, Math.ceil(n / PER_PAGE)) };
}

export async function closingSoon(n = 10) {
  return (await base()
    .where(and(eq(s.sources.enabled, true), ne(s.listings.status, "ended"), gte(s.listings.auctionAt, new Date())))
    .orderBy(asc(s.listings.auctionAt))
    .limit(n)) as Card[];
}

export async function newest(n = 8) {
  return (await base().where(and(eq(s.sources.enabled, true), ne(s.listings.status, "ended"))).orderBy(desc(s.listings.firstSeenAt), desc(s.listings.id)).limit(n)) as Card[];
}

export async function getListing(id: number) {
  const [row] = await db
    .select({ l: s.listings, sourceName: s.sources.name, sourceHome: s.sources.homepage })
    .from(s.listings)
    .innerJoin(s.sources, eq(s.sources.id, s.listings.sourceId))
    .where(and(eq(s.listings.id, id), eq(s.sources.enabled, true)));
  return row ?? null;
}

export async function similar(l: { id: number; type: string; city: string | null }, n = 4) {
  return (await base()
    .where(and(eq(s.sources.enabled, true), ne(s.listings.status, "ended"), ne(s.listings.id, l.id), l.city ? or(eq(s.listings.city, l.city), eq(s.listings.type, l.type)) : eq(s.listings.type, l.type)))
    .orderBy(sql`${s.listings.city} = ${l.city ?? ""} desc`, asc(s.listings.auctionAt))
    .limit(n)) as Card[];
}

/** City and type counts for the filters and the home page. Live listings only. */
export async function facets() {
  const live = and(eq(s.sources.enabled, true), ne(s.listings.status, "ended"));
  const cities = await db
    .select({ city: s.listings.city, n: count() })
    .from(s.listings)
    .innerJoin(s.sources, eq(s.sources.id, s.listings.sourceId))
    .where(and(live, sql`${s.listings.city} is not null`))
    .groupBy(s.listings.city)
    .orderBy(desc(count()))
    .limit(40);
  const types = await db.select({ type: s.listings.type, n: count() }).from(s.listings).innerJoin(s.sources, eq(s.sources.id, s.listings.sourceId)).where(live).groupBy(s.listings.type);
  const banks = await db
    .select({ bank: s.listings.bank, n: count() })
    .from(s.listings)
    .innerJoin(s.sources, eq(s.sources.id, s.listings.sourceId))
    .where(and(live, sql`${s.listings.bank} is not null`))
    .groupBy(s.listings.bank)
    .orderBy(desc(count()))
    .limit(60);
  return { cities: cities.filter((c): c is { city: string; n: number } => !!c.city), banks: banks.filter((b): b is { bank: string; n: number } => !!b.bank), types };
}

export async function stats() {
  const [live] = await db.select({ n: count() }).from(s.listings).innerJoin(s.sources, eq(s.sources.id, s.listings.sourceId)).where(and(eq(s.sources.enabled, true), ne(s.listings.status, "ended")));
  const [src] = await db.select({ n: count() }).from(s.sources).where(eq(s.sources.enabled, true));
  const [last] = await db.select({ at: sql<number | null>`max(${s.sources.lastOkAt})` }).from(s.sources).where(eq(s.sources.enabled, true));
  const f = await facets();
  return { live: live.n, sources: src.n, cities: f.cities.length, lastSyncAt: last.at ? new Date(last.at) : null };
}

export async function recordClick(id: number): Promise<string | null> {
  const [row] = await db.select({ url: s.listings.url }).from(s.listings).where(eq(s.listings.id, id));
  if (!row || !/^https?:\/\//i.test(row.url)) return null;
  await db.update(s.listings).set({ clicks: sql`${s.listings.clicks} + 1` }).where(eq(s.listings.id, id));
  return row.url;
}

