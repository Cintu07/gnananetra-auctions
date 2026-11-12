import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { runAll } from "@/lib/sync/run";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

// Called by the cron trigger (worker.ts) and by `npm run sync`. Needs the SYNC_SECRET header.
// ?force=1 refreshes every source now instead of only the ones that are due; ?only=slug picks one.

function authorised(req: Request) {
  const secret = process.env.SYNC_SECRET;
  const given = req.headers.get("x-sync-secret") ?? "";
  if (!secret || secret.length < 16) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const url = new URL(req.url);
  const results = await runAll(db, { siteUrl: SITE_URL, force: url.searchParams.get("force") === "1", only: url.searchParams.get("only") ?? undefined });
  revalidateTag("listings", "max");
  return NextResponse.json({ ok: true, results });
}
