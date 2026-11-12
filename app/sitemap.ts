import type { MetadataRoute } from "next";
import { and, eq, ne } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await db
    .select({ id: s.listings.id, at: s.listings.updatedAt })
    .from(s.listings)
    .innerJoin(s.sources, eq(s.sources.id, s.listings.sourceId))
    .where(and(eq(s.sources.enabled, true), ne(s.listings.status, "ended")))
    .limit(5000);
  return [
    { url: SITE_URL, priority: 1 },
    { url: `${SITE_URL}/auctions`, priority: 0.9 },
    { url: `${SITE_URL}/sources`, priority: 0.3 },
    ...rows.map((r) => ({ url: `${SITE_URL}/auction/${r.id}`, lastModified: r.at, priority: 0.6 })),
  ];
}
