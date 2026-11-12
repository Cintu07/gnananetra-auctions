import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronRight, Landmark, ExternalLink, Info, MapPin, Ruler, ShieldAlert, Wallet } from "lucide-react";
import ListingCard from "@/components/ListingCard";
import ListingImage from "@/components/ListingImage";
import Countdown from "@/components/Countdown";
import { formatArea, formatInr } from "@/lib/parse";
import { TYPE_LABEL, auctionDate, pricePerSqft } from "@/lib/parse-ui";
import { getListing, similar } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getListing(Number((await params).id));
  if (!row) return { title: "Auction not found" };
  const l = row.l;
  return { title: l.title, description: `${l.title}. Reserve price ${formatInr(l.price)}. ${l.auctionAt ? `Auction ${auctionDate(l.auctionAt)}.` : ""} View on ${row.sourceName}.` };
}

export default async function AuctionPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const row = await getListing(id);
  if (!row) notFound();
  const { l, sourceName } = row;
  const more = await similar(l);
  const ended = l.status === "ended";
  const where = [l.locality, l.city, l.state].filter(Boolean).join(", ");
  const per = pricePerSqft(l.price, l.areaSqft);

  const facts: [string, string | null, typeof Ruler][] = [
    ["Reserve price", l.price ? formatInr(l.price) : null, Wallet],
    ["Earnest money (EMD)", l.emd ? formatInr(l.emd) : null, Wallet],
    ["Auctioned by", l.bank, Landmark],
    ["Area", formatArea(l.areaSqft), Ruler],
    ["Auction date", auctionDate(l.auctionAt), CalendarClock],
    ["Location", where || null, MapPin],
  ];

  return (
    <div className="wrap py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-x-1 text-[13px] text-muted">
        <Link href="/" className="inline-flex min-h-10 min-w-10 items-center hover:text-ink">Home</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href="/auctions" className="inline-flex min-h-10 min-w-10 items-center hover:text-ink">Auctions</Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={`/auctions?type=${l.type}`} className="inline-flex min-h-10 min-w-10 items-center hover:text-ink">{TYPE_LABEL[l.type] ?? "Property"}</Link>
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
        <div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-canvas ring-1 ring-line">
            <ListingImage src={l.image} type={l.type} alt={l.title} />
            {ended && <div className="absolute inset-0 grid place-items-center bg-ink/55 text-[15px] font-bold tracking-wide text-white uppercase">Auction over</div>}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="chip bg-brand-50 text-brand-800">{TYPE_LABEL[l.type] ?? "Property"}</span>
            {!ended && <Countdown at={l.auctionAt ? l.auctionAt.toISOString() : null} className="rounded-full bg-surface px-3 py-1 ring-1 ring-line" />}
          </div>
          <h1 className="mt-3 text-[26px] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance sm:text-[34px]">{l.title}</h1>
          {where && (
            <p className="mt-2 flex items-center gap-1.5 text-[15px] text-muted">
              <MapPin className="size-4" aria-hidden /> {where}
            </p>
          )}

          <dl className="card mt-7 divide-y divide-line">
            {facts.filter(([, v]) => v).map(([k, v, Icon]) => (
              <div key={k} className="flex items-start justify-between gap-6 px-5 py-4">
                <dt className="flex items-center gap-2.5 text-[14px] text-muted"><Icon className="size-4 shrink-0" aria-hidden />{k}</dt>
                <dd className="text-right text-[15px] font-semibold text-ink tabular-nums">{v}</dd>
              </div>
            ))}
            {per && (
              <div className="flex items-start justify-between gap-6 px-5 py-4">
                <dt className="flex items-center gap-2.5 text-[14px] text-muted"><Info className="size-4 shrink-0" aria-hidden />Works out to</dt>
                <dd className="text-right text-[15px] font-semibold text-ink tabular-nums">{per}</dd>
              </div>
            )}
          </dl>

          {l.description && (
            <div className="mt-7">
              <h2 className="text-[18px] font-bold">About this auction</h2>
              <p className="mt-2 max-w-prose text-[15.5px] leading-relaxed text-body">{l.description}</p>
            </div>
          )}

          <p className="mt-7 flex gap-3 rounded-2xl bg-warn-50 p-4 text-[13.5px] leading-relaxed text-warn">
            <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>This page is a summary gathered from {sourceName}. Prices, dates and details can change. Check the title documents, EMD terms and auction rules on the original listing before you bid.</span>
          </p>
        </div>

        {/* the action panel: beside the content on desktop, a bar at the bottom of the screen on phones */}
        <aside className="hidden lg:block">
          <div className="card sticky top-24 p-6">
            <p className="text-[12px] font-bold tracking-wide text-faint uppercase">Reserve price</p>
            <p className="mt-1 text-[34px] leading-none font-extrabold tracking-[-0.03em] tabular-nums">{formatInr(l.price)}</p>
            {per && <p className="mt-1.5 text-[13px] text-muted tabular-nums">{per}</p>}
            <div className="mt-4 rounded-xl bg-canvas p-3.5">
              <p className="text-[12px] text-muted">{ended ? "Auction ended" : "Auction closes"}</p>
              <p className="text-[15px] font-bold">{auctionDate(l.auctionAt) ?? "See the original listing"}</p>
              {!ended && <Countdown at={l.auctionAt ? l.auctionAt.toISOString() : null} className="mt-1" />}
            </div>
            <a href={`/go/${l.id}`} target="_blank" rel="nofollow noopener sponsored" className="btn-primary mt-5 w-full py-3.5">
              {ended ? "See it on" : "View and bid on"} {sourceName} <ExternalLink className="size-4" aria-hidden />
            </a>
            <p className="mt-3 text-center text-[12.5px] leading-snug text-muted">Opens the original website in a new tab. Registration and bidding happen there.</p>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-bold tracking-wide text-faint uppercase">Reserve</p>
            <p className="text-[19px] leading-none font-extrabold tabular-nums">{formatInr(l.price)}</p>
          </div>
          <a href={`/go/${l.id}`} target="_blank" rel="nofollow noopener sponsored" className="btn-primary ml-auto min-h-12 flex-1 py-3 sm:flex-none sm:px-7">
            {ended ? "See on" : "View and bid on"} {sourceName} <ExternalLink className="size-4 shrink-0" aria-hidden />
          </a>
        </div>
      </div>

      {more.length > 0 && (
        <section className="mt-14 pb-20 lg:pb-0" aria-labelledby="more">
          <h2 id="more" className="section-title mb-5">Similar auctions</h2>
          <ul className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 lg:grid-cols-4">
            {more.map((m) => (
              <li key={m.id}>
                <ListingCard l={m} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
