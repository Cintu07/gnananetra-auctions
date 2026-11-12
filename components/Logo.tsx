// The Gnananetra logo: raster emblem (the yantra has fine colour detail) + vector wordmark.
// `size` is the emblem height in px; the wordmark keeps the original proportions.
export default function Logo({ size = 40, tone = "color", suffix, className = "" }: { size?: number; tone?: "color" | "white"; suffix?: string; className?: string }) {
  const wordH = Math.round(size * 0.42);
  const wordW = Math.round(wordH * 5.854);
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`} style={{ gap: Math.round(size * 0.14) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/emblem.png" alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0" />
      <span className="flex flex-col">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tone === "white" ? "/brand/wordmark-white.svg" : "/brand/wordmark.svg"} alt="Gnananetra" width={wordW} height={wordH} style={{ width: wordW, height: wordH }} className="shrink-0" />
        {suffix && (
          <span data-audit-skip className={`mt-[3px] text-[10px] leading-none font-bold tracking-[0.32em] uppercase ${tone === "white" ? "text-white/70" : "text-muted"}`} style={{ fontSize: Math.max(9, Math.round(size * 0.24)) }}>
            {suffix}
          </span>
        )}
      </span>
    </span>
  );
}
