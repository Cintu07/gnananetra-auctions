// npm run sync [-- --only=slug]
// Refreshes every source now, through the running site (npm run dev). On Cloudflare the cron
// trigger does this on its own every 3 hours.
const base = process.env.SYNC_URL ?? "http://localhost:3000";
const secret = process.env.SYNC_SECRET;
if (!secret) throw new Error("SYNC_SECRET is not set (see .env.local)");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const res = await fetch(`${base}/api/sync?force=1${only ? `&only=${only}` : ""}`, { method: "POST", headers: { "x-sync-secret": secret } });
const body = await res.json();
if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
for (const r of body.results) {
  console.log(`${r.status.padEnd(5)} ${r.source}: ${r.found} found, ${r.added} new, ${r.updated} updated, ${r.ended} ended${r.invalid ? `, ${r.invalid} skipped as invalid` : ""}${r.error ? `  (${r.error})` : ""}`);
}
