"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import TypeIcon from "@/components/TypeIcon";
import { TYPE_PLURAL } from "@/lib/parse-ui";

const PRICES = [
  { label: "Any price", min: "", max: "" },
  { label: "Under ₹10 L", min: "", max: "1000000" },
  { label: "₹10 L to ₹25 L", min: "1000000", max: "2500000" },
  { label: "₹25 L to ₹50 L", min: "2500000", max: "5000000" },
  { label: "₹50 L to ₹1 Cr", min: "5000000", max: "10000000" },
  { label: "₹1 Cr to ₹5 Cr", min: "10000000", max: "50000000" },
  { label: "Above ₹5 Cr", min: "50000000", max: "" },
];

const SORTS = [
  { v: "closing", label: "Closing soonest" },
  { v: "newest", label: "Newly added" },
  { v: "price-asc", label: "Price: low to high" },
  { v: "price-desc", label: "Price: high to low" },
];

export default function Filters({ cities, banks, types, total }: { cities: { city: string; n: number }[]; banks: { bank: string; n: number }[]; types: { type: string; n: number }[]; total: number }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const get = (k: string) => params.get(k) ?? "";
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    next.delete("page");
    start(() => router.push(`${path}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  const priceIdx = Math.max(0, PRICES.findIndex((p) => p.min === get("min") && p.max === get("max")));
  const active = ["type", "city", "bank", "min", "max", "q"].filter((k) => get(k)).length + (get("status") === "ended" ? 1 : 0);
  const status = get("status") === "ended" ? "ended" : "live";

  const body = (
    <div className="space-y-6">
      <div>
        <p className="label">Property type</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => set({ type: "" })} aria-pressed={!get("type")} className={`chip min-h-10 px-3.5 text-[13px] ring-1 ring-inset ${!get("type") ? "bg-ink text-white ring-ink" : "bg-surface text-ink-2 ring-line-2 hover:bg-canvas"}`}>
            All
          </button>
          {types.map((t) => (
            <button key={t.type} type="button" onClick={() => set({ type: t.type })} aria-pressed={get("type") === t.type} className={`chip min-h-10 gap-1.5 px-3.5 text-[13px] ring-1 ring-inset ${get("type") === t.type ? "bg-ink text-white ring-ink" : "bg-surface text-ink-2 ring-line-2 hover:bg-canvas"}`}>
              <TypeIcon type={t.type} className="size-3.5" />
              {TYPE_PLURAL[t.type] ?? t.type} <span className="opacity-60">{t.n}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="f-city" className="label">City</label>
        <select id="f-city" className="field" value={get("city")} onChange={(e) => set({ city: e.target.value })}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.city} value={c.city}>{c.city} ({c.n})</option>
          ))}
        </select>
      </div>

      {banks.length > 0 && (
        <div>
          <label htmlFor="f-bank" className="label">Bank</label>
          <select id="f-bank" className="field" value={get("bank")} onChange={(e) => set({ bank: e.target.value })}>
            <option value="">All banks</option>
            {banks.map((b) => (
              <option key={b.bank} value={b.bank}>{b.bank} ({b.n})</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="f-price" className="label">Reserve price</label>
        <select id="f-price" className="field" value={priceIdx} onChange={(e) => set({ min: PRICES[Number(e.target.value)].min, max: PRICES[Number(e.target.value)].max })}>
          {PRICES.map((p, i) => (
            <option key={p.label} value={i}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="label">Show</p>
        <div className="grid grid-cols-2 rounded-xl bg-canvas p-1" role="group" aria-label="Auction status">
          {(["live", "ended"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={status === v} onClick={() => set({ status: v === "ended" ? "ended" : "" })} className={`min-h-10 rounded-lg text-[13.5px] font-semibold transition-colors ${status === v ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"}`}>
              {v === "live" ? "Open now" : "Past auctions"}
            </button>
          ))}
        </div>
      </div>

      {active > 0 && (
        <button type="button" onClick={() => set({ type: "", city: "", bank: "", min: "", max: "", q: "", status: "" })} className="inline-flex min-h-10 items-center gap-1.5 text-[13.5px] font-semibold text-brand-700 hover:text-brand-800">
          <X className="size-4" aria-hidden /> Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className={pending ? "opacity-70 transition-opacity" : "transition-opacity"}>
      <div className="mb-4 flex items-center gap-3 lg:hidden">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn-outline btn-sm">
          <SlidersHorizontal className="size-4" aria-hidden /> Filters{active > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand-700 text-[12px] text-white">{active}</span>}
        </button>
        <label className="ml-auto flex items-center gap-2 text-[13px] text-muted">
          <span className="sr-only sm:not-sr-only">Sort</span>
          <select aria-label="Sort" className="field !w-auto !min-h-11 !py-2 !text-[13.5px]" value={get("sort") || "closing"} onChange={(e) => set({ sort: e.target.value === "closing" ? "" : e.target.value })}>
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </label>
      </div>
      {open && <div className="card mb-5 animate-rise p-4 lg:hidden">{body}</div>}

      <div className="hidden lg:block">
        <div className="card p-5">
          <p className="mb-5 text-[13px] text-muted"><span className="font-bold text-ink tabular-nums">{total.toLocaleString("en-IN")}</span> {total === 1 ? "auction" : "auctions"}</p>
          {body}
        </div>
      </div>
    </div>
  );
}

export function SortSelect() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (
    <label className="hidden items-center gap-2 text-[13px] text-muted lg:flex">
      Sort by
      <select
        className="field !w-auto !min-h-11 !py-2 !text-[13.5px]"
        value={params.get("sort") ?? "closing"}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "closing") next.delete("sort");
          else next.set("sort", e.target.value);
          next.delete("page");
          router.push(`${path}${next.size ? `?${next}` : ""}`, { scroll: false });
        }}
      >
        {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
      </select>
    </label>
  );
}
