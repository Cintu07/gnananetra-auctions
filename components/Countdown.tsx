"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { auctionDate, timeLeft } from "@/lib/parse-ui";

// "Ends in 2d 4h", counting down on the visitor's screen. Before it mounts it shows the fixed date,
// so server and browser agree and nothing jumps.
export default function Countdown({ at, className = "", onDark = false }: { at: string | null; className?: string; onDark?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!at) return <span className={`text-[12px] ${onDark ? "text-white/70" : "text-muted"} ${className}`}>Date on source</span>;
  const date = new Date(at);
  const left = now ? timeLeft(date, now) : null;
  const tone = !left ? (onDark ? "text-white/80" : "text-muted") : left.over ? "text-faint" : left.urgent ? (onDark ? "text-[#ffb4a8]" : "text-danger") : onDark ? "text-white" : "text-ink-2";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold ${tone} ${className}`} title={auctionDate(date) ?? undefined} suppressHydrationWarning>
      <Clock className="size-3.5 shrink-0" aria-hidden />
      {left ? left.text : (auctionDate(date) ?? "").split(",")[0]}
    </span>
  );
}
