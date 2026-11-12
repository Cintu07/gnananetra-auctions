import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="wrap">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-12 py-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:gap-16">
          <div className="max-w-sm">
            <Logo size={44} suffix="Auctions" />
            <p className="mt-5 text-[14.5px] leading-relaxed text-muted">
              Bank property auctions from the official portal, gathered in one place and kept up to date. We are an independent guide: every auction is held, and every bid is placed, on the original website.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
            <div>
              <h2 className="text-[13px] font-semibold text-ink">Browse</h2>
              <ul className="mt-4 space-y-0.5 text-[14px] sm:space-y-2.5">
                {[["/auctions", "All auctions"], ["/auctions?type=house", "Houses"], ["/auctions?type=flat", "Flats"], ["/auctions?type=land", "Plots and land"], ["/auctions?type=shop", "Shops"], ["/auctions?type=commercial", "Commercial"]].map(([href, label]) => (
                  <li key={href}><Link href={href} className="inline-flex min-h-10 min-w-10 items-center text-muted transition-colors hover:text-ink lg:min-h-0">{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-ink">About</h2>
              <ul className="mt-4 space-y-0.5 text-[14px] sm:space-y-2.5">
                {[["/sources", "Where listings come from"], ["/auctions?status=ended", "Past auctions"]].map(([href, label]) => (
                  <li key={href}><Link href={href} className="inline-flex min-h-10 min-w-10 items-center text-muted transition-colors hover:text-ink lg:min-h-0">{label}</Link></li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h2 className="text-[13px] font-semibold text-ink">Gnananetra</h2>
              <ul className="mt-4 space-y-0.5 text-[14px] sm:space-y-2.5">
                <li>
                  <a href="https://gnananetra.com" className="inline-flex min-h-10 min-w-10 items-center gap-1 text-muted transition-colors hover:text-ink lg:min-h-0">
                    Gnananetra Consulting <ArrowUpRight className="size-3.5" aria-hidden />
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="border-t border-line py-6 text-[13px] leading-relaxed text-muted">
          <p>Listings, photos and prices belong to the websites they come from and can change at any time. Always check the details, title documents and terms on the original site before you bid. This is not legal or financial advice.</p>
          <p className="mt-3">© {new Date().getFullYear()} Gnananetra</p>
        </div>
      </div>
      <div aria-hidden className="wrap pointer-events-none overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wordmark.svg" alt="" className="-mb-[3%] block w-full opacity-[0.09] [mask-image:linear-gradient(to_bottom,black_35%,transparent_100%)]" />
      </div>
    </footer>
  );
}
