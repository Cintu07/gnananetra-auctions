"use client";

import { useState } from "react";
import TypeIcon, { TYPE_TINT } from "@/components/TypeIcon";
import { TYPE_LABEL } from "@/lib/parse-ui";

// The source's photo when it loads (linked, never copied), otherwise a clean illustrated tile.
export default function ListingImage({ src, type, alt, className = "" }: { src: string | null; type: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={`size-full object-cover ${className}`} />
    );
  }
  return (
    <div className={`relative grid size-full place-items-center overflow-hidden bg-gradient-to-br ${TYPE_TINT[type] ?? TYPE_TINT.land} ${className}`} role="img" aria-label={alt}>
      <svg aria-hidden className="absolute inset-0 size-full opacity-[0.35]" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" fill="none" stroke="currentColor" strokeWidth="0.6">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} d={`M-10 ${22 + i * 14} C 40 ${6 + i * 14}, 90 ${44 + i * 14}, 140 ${24 + i * 14} S 190 ${14 + i * 14}, 215 ${30 + i * 14}`} />
        ))}
      </svg>
      <div className="relative flex flex-col items-center gap-1.5">
        <TypeIcon type={type} className="size-10 sm:size-11" />
        <span className="text-[12px] font-bold tracking-[0.14em] uppercase opacity-80">{TYPE_LABEL[type] ?? "Property"}</span>
      </div>
    </div>
  );
}
