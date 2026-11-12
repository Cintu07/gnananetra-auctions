import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import Logo from "@/components/Logo";

const NAV = [
  { href: "/auctions", label: "All auctions" },
  { href: "/auctions?type=house", label: "Houses" },
  { href: "/auctions?type=flat", label: "Flats" },
  { href: "/auctions?type=land", label: "Plots and land" },
  { href: "/auctions?type=shop", label: "Shops" },
  { href: "/sources", label: "Where listings come from" },
];

export default function Header() {
  return (
    <>
      <header className="sticky top-0 z-40 bg-surface shadow-[0_1px_0_var(--color-line)]">
        <div className="wrap flex items-center gap-3 py-2.5 lg:gap-8 lg:py-3.5">
          <Link href="/" aria-label="Gnananetra Auctions home" className="flex min-h-11 shrink-0 items-center">
            <span className="sm:hidden"><Logo size={32} suffix="Auctions" /></span>
            <span className="hidden sm:block"><Logo size={40} suffix="Auctions" /></span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-[14px] font-semibold text-ink-2 transition-colors hover:bg-canvas hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>

          <form action="/auctions" className="relative ml-auto hidden w-full max-w-[320px] md:block">
            <label htmlFor="h-q" className="sr-only">Search auctions</label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <input id="h-q" name="q" type="search" placeholder="Search city, area or plot" className="h-10 w-full rounded-full border border-line-2 bg-canvas pr-4 pl-10 text-[14px] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-faint focus:border-brand-700 focus:bg-surface focus:ring-4 focus:ring-brand-100" />
          </form>

          {/* phones and tablets: a menu that needs no JavaScript */}
          <details className="group relative ml-auto lg:hidden">
            <summary aria-label="Menu" className="grid size-11 cursor-pointer list-none place-items-center rounded-full hover:bg-canvas [&::-webkit-details-marker]:hidden">
              <Menu className="size-6 group-open:hidden" aria-hidden />
              <X className="hidden size-6 group-open:block" aria-hidden />
            </summary>
            <div className="fixed inset-x-0 top-[57px] z-50 max-h-[calc(100dvh-57px)] animate-[rise_0.25s_ease-out] overflow-y-auto border-t border-line bg-surface p-4 shadow-lift">
              <form action="/auctions" className="relative mb-3">
                <label htmlFor="m-q" className="sr-only">Search auctions</label>
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" aria-hidden />
                <input id="m-q" name="q" type="search" placeholder="Search city, area or plot" className="h-12 w-full rounded-xl border border-line-2 bg-canvas pr-4 pl-10 text-[15px] outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-100" />
              </form>
              <ul>
                {NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="flex min-h-12 items-center border-b border-line text-[16px] font-semibold text-ink">{n.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      </header>
    </>
  );
}
