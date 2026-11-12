import { NextResponse } from "next/server";
import { recordClick } from "@/lib/queries";

export const dynamic = "force-dynamic";

// "View on the original site": counts the click, then sends the visitor to the source's own page.
// Only http(s) addresses saved by the sync engine are ever used as the destination.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const url = Number.isInteger(id) && id > 0 ? await recordClick(id) : null;
  if (!url) return NextResponse.redirect(new URL("/auctions", _req.url), 302);
  return NextResponse.redirect(url, 302);
}
