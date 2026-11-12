import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import Filters, { SortSelect } from "@/components/Filters";
import ListingCard from "@/components/ListingCard";
import { facets, searchListings, type SortKey } from "@/lib/queries";
import { TYPE_PLURAL } from "@/lib/parse-ui";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => (v && /^\d{1,12}$/.test(v) ? Number(v) : undefined);
const SORTS: SortKey[] = ["closing", "newest", "price-asc", "price-desc"];

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const type = one(sp.type);
  const city = one(sp.city);
  const label = [type && TYPE_PLURAL[type], city && `in ${city}`].filter(Boolean).join(" ");
  return { title: label ? `${label}: auctions` : "All auctions" };
}

export default async function AuctionsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sort = one(sp.sort) as SortKey | undefined;
  const query = {
    q: one(sp.q),
    type: one(sp.type),
    city: one(sp.city),
    bank: one(sp.bank),
    min: num(one(sp.min)),
    max: num(one(sp.max)),
    status: one(sp.status) === "ended" ? ("ended" as const) : ("live" as const),
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: num(one(sp.page)),
  };
  const [{ rows, total, page, pages }, f] = await Promise.all([searchListings(query), facets()]);

  const href = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (k !== "page" && one(v)) next.set(k, one(v)!);
    if (p > 1) next.set("page", String(p));
    return `/auctions${next.size ? `?${next}` : ""}`;
  };

  const title = query.status === "ended" ? "Past auctions" : query.type ? (TYPE_PLURAL[query.type] ?? "Auctions") : "All auctions";

  return (
    <div className="wrap py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">{query.status === "ended" ? "Already closed" : "Open for bids"}</p>
          <h1 className="section-title">
            {title}
            {query.city ? <span className="text-muted"> in {query.city}</span> : null}
            {query.bank ? <span className="text-muted"> by {query.bank}</span> : null}
          </h1>
          {query.q && <p className="mt-1 text-[14px] text-muted">Results for “{query.q}”</p>}
        </div>
        <Suspense>
          <SortSelect />
        </Suspense>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-8">
        <aside aria-label="Filters" className="lg:sticky lg:top-24 lg:self-start">
          <Suspense>
            <Filters cities={f.cities} banks={f.banks} types={f.types} total={total} />
          </Suspense>
        </aside>

        <section aria-label="Results">
          <p className="mb-4 text-[13px] text-muted lg:hidden">
            <span className="font-bold text-ink tabular-nums">{total.toLocaleString("en-IN")}</span> {total === 1 ? "auction" : "auctions"}
          </p>
          {rows.length === 0 ? (
            <div className="card grid place-items-center px-6 py-16 text-center">
              <SearchX className="size-10 text-faint" aria-hidden />
              <h2 className="mt-4 text-[18px] font-bold">No auctions match these filters</h2>
              <p className="mt-1 max-w-sm text-[14px] text-muted">Try a different city or price range, or clear the filters to see everything that is open.</p>
              <Link href="/auctions" className="btn-dark btn-sm mt-5">Clear filters</Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 xl:grid-cols-3">
              {rows.map((l) => (
                <li key={l.id}>
                  <ListingCard l={l} />
                </li>
              ))}
            </ul>
          )}

          {pages > 1 && (
            <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-2">
              {page > 1 ? (
                <Link href={href(page - 1)} className="btn-outline btn-sm"><ChevronLeft className="size-4" aria-hidden /> Previous</Link>
              ) : (
                <span className="btn-outline btn-sm pointer-events-none opacity-40"><ChevronLeft className="size-4" aria-hidden /> Previous</span>
              )}
              <span className="px-3 text-[13.5px] text-muted tabular-nums">Page {page} of {pages}</span>
              {page < pages ? (
                <Link href={href(page + 1)} className="btn-outline btn-sm">Next <ChevronRight className="size-4" aria-hidden /></Link>
              ) : (
                <span className="btn-outline btn-sm pointer-events-none opacity-40">Next <ChevronRight className="size-4" aria-hidden /></span>
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
