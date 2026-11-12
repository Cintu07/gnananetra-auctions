import Link from "next/link";
import { Landmark, MapPin, Ruler } from "lucide-react";
import ListingImage from "@/components/ListingImage";
import Countdown from "@/components/Countdown";
import { formatArea, formatInr } from "@/lib/parse";
import { TYPE_LABEL, pricePerSqft } from "@/lib/parse-ui";
import type { Card } from "@/lib/queries";

export default function ListingCard({ l }: { l: Card }) {
  const where = [l.locality, l.city].filter(Boolean).join(", ") || l.state || "Location on source";
  const per = pricePerSqft(l.price, l.areaSqft);
  const ended = l.status === "ended";
  return (
    <Link
      href={`/auction/${l.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lift hover:ring-line-2"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-canvas">
        <ListingImage src={l.image} type={l.type} alt={l.title} className="transition-transform duration-500 group-hover:scale-[1.04]" />
        <span className="chip absolute top-3 left-3 bg-white/95 text-ink-2 shadow-card backdrop-blur">{TYPE_LABEL[l.type] ?? "Property"}</span>
        {ended && <div className="absolute inset-0 grid place-items-center bg-ink/55 text-[13px] font-bold tracking-wide text-white uppercase">Auction over</div>}
        {!ended && (
          <div className="absolute inset-x-0 bottom-0 flex items-center bg-gradient-to-t from-ink/70 to-transparent px-3 pt-8 pb-2.5">
            <Countdown at={l.auctionAt ? l.auctionAt.toISOString() : null} onDark />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-bold tracking-[-0.01em] text-ink">{l.title}</h3>
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{where}</span>
        </p>
        {l.bank && <p className="-mt-1 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2"><Landmark className="size-3.5 shrink-0 text-faint" aria-hidden /><span className="truncate">{l.bank}</span></p>}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <p className="text-[12px] font-semibold tracking-wide text-faint uppercase">Reserve price</p>
            <p className="text-[19px] leading-tight font-extrabold tracking-[-0.02em] text-ink tabular-nums">{formatInr(l.price)}</p>
            {per && <p className="text-[12px] text-muted tabular-nums">{per}</p>}
          </div>
          {l.areaSqft && (
            <p className="flex items-center gap-1 rounded-lg bg-canvas px-2 py-1 text-[12.5px] font-semibold text-ink-2 tabular-nums">
              <Ruler className="size-3.5" aria-hidden />
              {formatArea(l.areaSqft)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
