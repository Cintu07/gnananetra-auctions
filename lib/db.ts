import "server-only";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "@/db/schema";

// Cloudflare D1. On Workers the binding comes with each request; under `next dev` the same
// binding is a local D1 (initOpenNextCloudflareForDev in next.config.ts), stored in .wrangler/.

export type DB = DrizzleD1Database<typeof schema>;
type D1 = Parameters<typeof drizzle>[0];

/** Wrap a D1 binding. The cron handler (worker.ts) has no request, so it calls this with env.DB. */
export const makeDb = (d1: D1): DB => drizzle(d1, { schema });

const cache = new WeakMap<object, DB>();

function real(): DB {
  const d1 = (getCloudflareContext().env as unknown as { DB?: D1 }).DB;
  if (!d1) throw new Error("The D1 binding `DB` is missing. Check wrangler.jsonc, then run `npm run db`.");
  let d = cache.get(d1);
  if (!d) cache.set(d1, (d = makeDb(d1)));
  return d;
}

// Lazy so that importing this module never needs a database (e.g. during the build).
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const target = real() as unknown as Record<PropertyKey, unknown>;
    const value = target[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
  },
});

export { schema };
