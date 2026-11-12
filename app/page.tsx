import Link from "next/link";
import { ArrowRight, BellRing, ExternalLink, Radar, Search } from "lucide-react";
import ListingCard from "@/components/ListingCard";
import TypeIcon, { TYPE_TINT } from "@/components/TypeIcon";
import { closingSoon, facets, newest, stats } from "@/lib/queries";
import { TYPE_PLURAL, ago } from "@/lib/parse-ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [soon, fresh, f, st] = await Promise.all([closingSoon(8), newest(8), facets(), stats()]);
  const counts = new Map(f.types.map((t) => [t.type, t.n]));
  const order = ["house", "flat", "land", "shop", "commercial", "farm"];

  return (
    <>
      {/* hero */}
      <section className="relative isolate overflow-hidden bg-night text-white">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_85%_0%,rgb(249_94_6/0.30)_0%,transparent_60%),radial-gradient(60%_80%_at_0%_100%,rgb(208_160_49/0.16)_0%,transparent_65%)]" />
        <div aria-hidden className="grain -z-10" />
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_80%_at_50%_0%,black,transparent)]" />
        <div className="wrap pt-14 pb-16 sm:pt-20 sm:pb-24">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-white/85 ring-1 ring-white/15 animate-rise">
            <span className="size-2 rounded-full bg-success animate-pulse-dot" aria-hidden /> {st.live.toLocaleString("en-IN")} auctions open now
          </p>
          <h1 className="mt-5 max-w-3xl text-[36px] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance sm:text-[56px] animate-rise [animation-delay:60ms]">
            Bank property auctions across India, <span className="text-brand">in one place.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/70 sm:text-[17.5px] animate-rise [animation-delay:120ms]">
            Homes, flats, plots and shops that banks are auctioning, gathered from the official portal and kept fresh. Find one you like, then bid on the original website.
          </p>

          <form action="/auctions" className="mt-8 flex max-w-2xl flex-col gap-2.5 rounded-3xl bg-white p-2.5 shadow-lift sm:flex-row sm:items-center sm:rounded-full animate-rise [animation-delay:180ms]">
            <label htmlFor="hero-q" className="sr-only">Search city, area or plot</label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-faint" aria-hidden />
              <input id="hero-q" name="q" type="search" placeholder="Search a city, area or plot" className="h-12 w-full rounded-full bg-transparent pr-4 pl-12 text-[16px] text-ink outline-none placeholder:text-faint" />
            </div>
            <label htmlFor="hero-type" className="sr-only">Property type</label>
            <select id="hero-type" name="type" className="h-12 rounded-full bg-canvas px-4 text-[14.5px] font-semibold text-ink-2 outline-none sm:w-48" defaultValue="">
              <option value="">All types</option>
              {order.map((t) => <option key={t} value={t}>{TYPE_PLURAL[t]}</option>)}
            </select>
            <button className="btn-primary h-12 px-7">Search</button>
          </form>

          <ul className="mt-7 flex flex-wrap gap-2 animate-rise [animation-delay:240ms]" aria-label="Popular cities">
            {f.cities.slice(0, 6).map((c) => (
              <li key={c.city}>
                <Link href={`/auctions?city=${encodeURIComponent(c.city)}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13.5px] font-semibold text-white/90 ring-1 ring-white/15 transition-colors hover:bg-white/20">
                  {c.city} <span className="text-white/50 tabular-nums">{c.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* trust strip */}
      <section className="wrap relative z-10" aria-label="How this site works">
        <ul className="-mt-8 grid grid-cols-1 divide-line rounded-2xl bg-surface shadow-lift ring-1 ring-line sm:grid-cols-3 sm:divide-x">
          {[
            { icon: Radar, t: "Checked every few hours", d: st.lastSyncAt ? `Last refreshed ${ago(st.lastSyncAt)}` : "Refreshed every few hours" },
            { icon: ExternalLink, t: "Bid on the original site", d: "Every card links to where the auction really runs" },
            { icon: BellRing, t: "Closing dates up front", d: "Sorted by time left, so nothing is missed" },
          ].map((x) => (
            <li key={x.t} className="flex items-start gap-3.5 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><x.icon className="size-5" aria-hidden /></span>
              <span>
                <span className="block text-[14.5px] font-bold">{x.t}</span>
                <span className="block text-[13px] leading-snug text-muted">{x.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* categories */}
      <section className="reveal wrap mt-14" aria-labelledby="cat">
        <p className="eyebrow mb-1.5">Browse by type</p>
        <h2 id="cat" className="section-title mb-5">What are you looking for?</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {order.map((t) => (
            <li key={t}>
              <Link href={`/auctions?type=${t}`} className={`group relative flex h-full min-h-[132px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-4 ring-1 ring-black/5 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lift ${TYPE_TINT[t]}`}>
                <TypeIcon type={t} className="size-7 transition-transform duration-300 group-hover:scale-110" />
                <span>
                  <span className="block text-[15px] leading-tight font-bold text-ink">{TYPE_PLURAL[t]}</span>
                  <span className="block text-[12.5px] font-medium text-ink/60 tabular-nums">{counts.get(t) ?? 0} open</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* closing soon */}
      {soon.length > 0 && (
        <section className="reveal wrap mt-14" aria-labelledby="soon">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-1.5">Don&apos;t miss out</p>
              <h2 id="soon" className="section-title">Closing soon</h2>
            </div>
            <Link href="/auctions?sort=closing" className="group -my-2 flex items-center gap-1.5 py-2.5 text-[14px] font-bold text-brand-700">
              View all <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
          <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {soon.map((l) => (
              <li key={l.id} className="w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                <ListingCard l={l} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* just added */}
      {fresh.length > 0 && (
        <section className="reveal wrap mt-14" aria-labelledby="fresh">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-1.5">Fresh from the sources</p>
              <h2 id="fresh" className="section-title">Just added</h2>
            </div>
            <Link href="/auctions?sort=newest" className="group -my-2 flex items-center gap-1.5 py-2.5 text-[14px] font-bold text-brand-700">
              View all <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 lg:grid-cols-4">
            {fresh.map((l) => (
              <li key={l.id}>
                <ListingCard l={l} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* how it works */}
      <section className="reveal wrap mt-16" aria-labelledby="how">
        <div className="relative isolate overflow-hidden rounded-3xl bg-brand-700 p-7 text-white sm:p-12">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_100%_0%,rgb(246_196_93/0.5)_0%,transparent_60%),radial-gradient(80%_80%_at_0%_100%,rgb(11_19_36/0.5)_0%,transparent_65%),linear-gradient(135deg,var(--color-brand-700),var(--color-brand))]" />
          <div aria-hidden className="grain -z-10" />
          <p className="text-[12px] font-bold tracking-[0.14em] text-white/80 uppercase">How it works</p>
          <h2 id="how" className="mt-2 max-w-xl text-[26px] leading-tight font-extrabold tracking-[-0.025em] sm:text-[34px]">We find them. You choose. The original site runs the auction.</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              ["1", "We gather", "Our system checks the auction websites every few hours and updates this list on its own."],
              ["2", "You browse", "Filter by city, type and price. See closing dates and reserve prices side by side."],
              ["3", "You bid there", "Tap View on the original site. Registration, EMD and bidding all happen on that website."],
            ].map(([n, t, d]) => (
              <li key={n} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-[15px] font-extrabold ring-1 ring-white/25">{n}</span>
                <span>
                  <span className="block text-[16px] font-bold">{t}</span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-white/85">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
