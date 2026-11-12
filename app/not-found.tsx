import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="wrap grid min-h-[60dvh] place-items-center py-16 text-center">
      <div>
        <SearchX className="mx-auto size-12 text-faint" aria-hidden />
        <h1 className="mt-5 text-[28px] font-extrabold tracking-[-0.02em]">We could not find that page</h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted">The auction may have been removed by its source, or the link is mistyped.</p>
        <Link href="/auctions" className="btn-primary mt-6">Browse open auctions</Link>
      </div>
    </div>
  );
}
