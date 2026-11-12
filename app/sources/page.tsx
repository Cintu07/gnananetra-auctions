import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { ago } from "@/lib/parse-ui";

export const metadata: Metadata = { title: "Where listings come from" };
export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const rows = await db.select().from(s.sources).where(eq(s.sources.enabled, true)).orderBy(s.sources.name);
  return (
    <div className="wrap max-w-3xl py-10 sm:py-14">
      <p className="eyebrow mb-1.5">Transparency</p>
      <h1 className="section-title">Where these listings come from</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-body">
        Gnananetra Auctions does not run auctions. A small program checks the websites below every few hours, collects each listing&apos;s headline details, and shows them here in one searchable list. Every listing links back to its original page, where the auction really takes place.
      </p>

      <ul className="card mt-8 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="font-bold text-ink">{r.name}</p>
              <p className="text-[13px] text-muted">{r.lastCount.toLocaleString("en-IN")} listings, refreshed {ago(r.lastOkAt)}</p>
            </div>
            <a href={r.homepage} target="_blank" rel="noopener" className="btn-outline btn-sm">
              Visit site <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-[20px] font-bold">Good to know</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-body">
        <li>Prices, dates and photos belong to the original websites and can change after we last checked.</li>
        <li>We collect only public listing details, we respect each site&apos;s robots.txt, and we visit slowly so we never strain their servers.</li>
        <li>When an auction disappears from its source, or its date passes, we mark it as over automatically.</li>
        <li>Always read the original listing, title documents and auction terms before you bid. Nothing here is legal or financial advice.</li>
        <li>If you run one of these websites and want your listings changed or removed here, contact Gnananetra and we will act on it quickly.</li>
      </ul>
    </div>
  );
}
