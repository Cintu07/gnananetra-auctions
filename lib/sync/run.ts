import { and, eq, inArray, lt, ne } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import * as schema from "@/db/schema";
import type { DB } from "@/lib/db";
import { politeFetcher } from "@/lib/sync/fetcher";
import { baanknet } from "@/lib/sync/adapters/baanknet";
import { html } from "@/lib/sync/adapters/html";
import { json } from "@/lib/sync/adapters/json";
import { jsonld } from "@/lib/sync/adapters/jsonld";
import { SOURCES } from "@/lib/sync/sources";
import { rawListing, type Adapter, type Fetcher, type RawListing, type SourceDef } from "@/lib/sync/types";

const ADAPTERS: Record<SourceDef["kind"], Adapter> = { jsonld, json, html, baanknet };

export type RunResult = { source: string; status: "ok" | "empty" | "error"; found: number; added: number; updated: number; ended: number; invalid: number; error?: string };

/** The honest name we fetch under, so site owners can see who we are. */
export const botName = (siteUrl: string) => `GnananetraAuctionsBot/1.0 (+${siteUrl}/sources)`;

/** A short fingerprint of a listing's source fields. Unchanged fingerprint = nothing to write. */
export function fingerprint(l: RawListing): string {
  const s = JSON.stringify([l.url, l.title, l.type, l.state, l.city, l.locality, l.bank, l.areaSqft, l.price, l.emd, l.auctionAt, l.image, l.description]);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// D1 runs a batch as one all-or-nothing transaction and allows 100 bound values per statement
async function batched(db: DB, stmts: BatchItem<"sqlite">[], size = 40) {
  for (let i = 0; i < stmts.length; i += size) {
    await db.batch(stmts.slice(i, i + size) as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  }
}
const parts = <T,>(list: T[], n: number) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

/** Make sure every source in sources.ts has a row; returns id by slug. */
async function ensureSources(db: DB): Promise<Map<string, number>> {
  for (const s of SOURCES) {
    await db
      .insert(schema.sources)
      .values({ slug: s.slug, name: s.name, homepage: s.homepage, kind: s.kind, enabled: s.enabled, intervalMin: s.intervalMin ?? 180 })
      .onConflictDoUpdate({
        target: schema.sources.slug,
        set: { name: s.name, homepage: s.homepage, kind: s.kind, enabled: s.enabled, intervalMin: s.intervalMin ?? 180 },
      });
  }
  const rows = await db.select({ id: schema.sources.id, slug: schema.sources.slug }).from(schema.sources);
  return new Map(rows.map((r) => [r.slug, r.id]));
}

const columns = (l: RawListing, hash: string) => {
  const ended = l.auctionAt != null && l.auctionAt < Date.now();
  return {
    url: l.url,
    title: l.title,
    type: l.type,
    state: l.state ?? null,
    city: l.city ?? null,
    locality: l.locality ?? null,
    bank: l.bank ?? null,
    areaSqft: l.areaSqft ?? null,
    price: l.price ?? null,
    emd: l.emd ?? null,
    auctionAt: l.auctionAt != null ? new Date(l.auctionAt) : null,
    image: l.image ?? null,
    description: l.description ?? null,
    status: ended ? "ended" : "live",
    endedAt: ended ? new Date(l.auctionAt!) : null,
    hash,
  };
};

/** Refresh one source: fetch, validate, write what is new or changed, retire what disappeared. Never throws. */
export async function runSource(db: DB, def: SourceDef, sourceId: number, fetcher: Fetcher): Promise<RunResult> {
  const [run] = await db.insert(schema.syncRuns).values({ sourceId }).returning({ id: schema.syncRuns.id });
  const result: RunResult = { source: def.slug, status: "ok", found: 0, added: 0, updated: 0, ended: 0, invalid: 0 };
  try {
    const items = await ADAPTERS[def.kind](def, fetcher);
    const good = new Map<string, RawListing>();
    for (const item of items) {
      const p = rawListing.safeParse(item);
      if (p.success) good.set(p.data.externalId, p.data);
      else result.invalid += 1;
    }
    result.found = good.size;

    const existing = await db
      .select({ id: schema.listings.id, externalId: schema.listings.externalId, hash: schema.listings.hash, status: schema.listings.status })
      .from(schema.listings)
      .where(eq(schema.listings.sourceId, sourceId));
    const byExt = new Map(existing.map((e) => [e.externalId, e]));
    const [prev] = await db.select({ lastCount: schema.sources.lastCount }).from(schema.sources).where(eq(schema.sources.id, sourceId));

    // a source that suddenly shows (almost) nothing has most likely changed its page, not sold out:
    // keep what we have and flag it, rather than wiping the site
    const suspicious = good.size === 0 || (prev.lastCount >= 10 && good.size < prev.lastCount * 0.3);

    if (!suspicious) {
      const now = new Date();
      const fresh: (typeof schema.listings.$inferInsert)[] = [];
      const changed: BatchItem<"sqlite">[] = [];
      for (const [ext, l] of good) {
        const hash = fingerprint(l);
        const old = byExt.get(ext);
        if (!old) fresh.push({ ...columns(l, hash), sourceId, externalId: ext, firstSeenAt: now, lastSeenAt: now, updatedAt: now, clicks: 0 });
        else if (old.hash !== hash || (old.status === "ended" && columns(l, hash).status === "live")) {
          changed.push(db.update(schema.listings).set({ ...columns(l, hash), lastSeenAt: now, updatedAt: now }).where(eq(schema.listings.id, old.id)));
        }
      }
      // new rows: a few per statement (D1 allows 100 bound values), many statements per batch
      await batched(
        db,
        parts(fresh, 4).map((rows) => db.insert(schema.listings).values(rows)),
      );
      await batched(db, changed);
      result.added = fresh.length;
      result.updated = changed.length;

      // gone from the source = no longer for auction
      const goneIds = existing.filter((e) => !good.has(e.externalId) && e.status !== "ended").map((e) => e.id);
      await batched(
        db,
        parts(goneIds, 90).map((ids) => db.update(schema.listings).set({ status: "ended", endedAt: now, updatedAt: now }).where(inArray(schema.listings.id, ids))),
      );
      result.ended = goneIds.length;
    } else {
      result.status = "empty";
      result.error = good.size === 0 ? "the source returned no listings (page layout may have changed); kept the old data" : `only ${good.size} listings against ${prev.lastCount} last time; kept the old data`;
    }
  } catch (e) {
    result.status = "error";
    result.error = e instanceof Error ? e.message.slice(0, 400) : String(e);
  }

  const now = new Date();
  await db
    .update(schema.syncRuns)
    .set({ finishedAt: now, found: result.found, added: result.added, updated: result.updated, ended: result.ended, status: result.status, error: result.error ?? null })
    .where(eq(schema.syncRuns.id, run.id));
  await db
    .update(schema.sources)
    .set({
      lastRunAt: now,
      lastStatus: result.status,
      lastError: result.error ?? null,
      ...(result.status === "ok" ? { lastOkAt: now, lastCount: result.found } : {}),
    })
    .where(eq(schema.sources.id, sourceId));
  return result;
}

/** Everything that is due (or everything, with force). Called by the cron trigger and /api/sync. */
export async function runAll(db: DB, opts: { siteUrl: string; force?: boolean; only?: string }): Promise<RunResult[]> {
  const ids = await ensureSources(db);
  const fetcher = politeFetcher(botName(opts.siteUrl));
  const rows = await db.select().from(schema.sources);
  const results: RunResult[] = [];
  for (const def of SOURCES) {
    if (opts.only && def.slug !== opts.only) continue;
    const row = rows.find((r) => r.slug === def.slug);
    if (!def.enabled) continue;
    const due = opts.force || !row?.lastRunAt || Date.now() - row.lastRunAt.getTime() >= (def.intervalMin ?? 180) * 60_000 - 60_000;
    if (!due) continue;
    results.push(await runSource(db, def, ids.get(def.slug)!, fetcher));
  }
  // any auction whose time has passed is over, whichever source it came from
  await db
    .update(schema.listings)
    .set({ status: "ended", endedAt: new Date(), updatedAt: new Date() })
    .where(and(ne(schema.listings.status, "ended"), lt(schema.listings.auctionAt, new Date())));
  // keep the run history small
  await db.delete(schema.syncRuns).where(lt(schema.syncRuns.startedAt, new Date(Date.now() - 30 * 86_400_000)));
  return results;
}
