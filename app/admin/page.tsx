import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { logout, syncNow } from "@/app/admin/actions";
import { isAdmin } from "@/lib/admin-auth";
import { db, schema as s } from "@/lib/db";
import { ago } from "@/lib/parse-ui";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Admin() {
  if (!(await isAdmin())) redirect("/admin/login");
  const sources = await db
    .select({
      src: s.sources,
      live: sql<number>`(select count(*) from listings l where l.source_id = ${s.sources.id} and l.status != 'ended')`,
      total: sql<number>`(select count(*) from listings l where l.source_id = ${s.sources.id})`,
      clicks: sql<number>`(select coalesce(sum(clicks), 0) from listings l where l.source_id = ${s.sources.id})`,
    })
    .from(s.sources)
    .orderBy(s.sources.id);
  const runs = await db.select({ r: s.syncRuns, name: s.sources.name }).from(s.syncRuns).innerJoin(s.sources, eq(s.sources.id, s.syncRuns.sourceId)).orderBy(desc(s.syncRuns.startedAt)).limit(15);
  const top = await db.select({ id: s.listings.id, title: s.listings.title, clicks: s.listings.clicks }).from(s.listings).where(sql`${s.listings.clicks} > 0`).orderBy(desc(s.listings.clicks)).limit(5);

  return (
    <div className="wrap py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">Admin</p>
          <h1 className="section-title">Sources and sync health</h1>
        </div>
        <div className="flex gap-2">
          <form action={syncNow}>
            <button className="btn-primary btn-sm"><RefreshCw className="size-4" aria-hidden /> Refresh everything now</button>
          </form>
          <form action={logout}>
            <button className="btn-outline btn-sm">Sign out</button>
          </form>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="border-b border-line text-[12px] tracking-wide text-faint uppercase">
            <tr>
              <th className="px-5 py-3">Source</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Open</th>
              <th className="px-3 py-3 text-right">Ever seen</th>
              <th className="px-3 py-3 text-right">Click-outs</th>
              <th className="px-3 py-3">Last run</th>
              <th className="px-5 py-3 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sources.map(({ src, live, total, clicks }) => (
              <tr key={src.id} className={src.enabled ? "" : "text-faint"}>
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-ink">{src.name}</p>
                  <p className="text-[12.5px] text-muted">{src.kind} · every {src.intervalMin / 60} h {src.enabled ? "" : "· off"}</p>
                </td>
                <td className="px-3 py-3.5">
                  {!src.enabled ? <span className="text-faint">Off</span> : src.lastStatus === "ok" ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-success"><CheckCircle2 className="size-4" aria-hidden /> Healthy</span>
                  ) : src.lastStatus ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-danger"><AlertTriangle className="size-4" aria-hidden /> {src.lastStatus === "empty" ? "Looks broken" : "Failed"}</span>
                  ) : <span className="text-muted">Not run yet</span>}
                  {src.lastError && <p className="mt-0.5 max-w-xs text-[12.5px] text-muted">{src.lastError}</p>}
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums">{live}</td>
                <td className="px-3 py-3.5 text-right tabular-nums">{total}</td>
                <td className="px-3 py-3.5 text-right tabular-nums">{clicks}</td>
                <td className="px-3 py-3.5 text-muted">{ago(src.lastRunAt)}</td>
                <td className="px-5 py-3.5 text-right">
                  {src.enabled && (
                    <form action={syncNow}>
                      <input type="hidden" name="only" value={src.slug} />
                      <button className="btn-outline btn-sm">Refresh</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] text-muted">Sources are listed in <code className="rounded bg-surface px-1.5 py-0.5 ring-1 ring-line">lib/sync/sources.ts</code>. Adding one is adding one entry there. “Looks broken” means a source suddenly returned (almost) nothing, so its old listings were kept instead of wiped.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-[16px] font-bold">Recent runs</h2>
          <ul className="mt-3 divide-y divide-line text-[13.5px]">
            {runs.map(({ r, name }) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><span className="font-semibold">{name}</span> <span className="text-muted">{ago(r.startedAt)}</span></span>
                <span className={r.status === "ok" ? "text-success" : r.status === "running" ? "text-muted" : "text-danger"}>
                  {r.status === "ok" ? `${r.found} found, ${r.added} new, ${r.ended} ended` : r.status}
                </span>
              </li>
            ))}
            {runs.length === 0 && <li className="py-3 text-muted">No runs yet.</li>}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="text-[16px] font-bold">Most clicked through to the source</h2>
          <ul className="mt-3 divide-y divide-line text-[13.5px]">
            {top.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/auction/${t.id}`} className="truncate font-semibold hover:text-brand-700">{t.title}</Link>
                <span className="shrink-0 text-muted tabular-nums">{t.clicks}</span>
              </li>
            ))}
            {top.length === 0 && <li className="py-3 text-muted">No click-outs yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
