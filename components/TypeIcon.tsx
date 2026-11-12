import { Building, Building2, House, LandPlot, Store, Wheat, type LucideIcon } from "lucide-react";

export const TYPE_ICON: Record<string, LucideIcon> = { land: LandPlot, farm: Wheat, shop: Store, commercial: Building2, house: House, flat: Building };

// each type gets its own warm or cool tint so a grid of cards without photos still reads at a glance
export const TYPE_TINT: Record<string, string> = {
  land: "from-[#fff0e3] via-[#ffe2c8] to-[#f9c9a0] text-brand-700",
  farm: "from-[#eef7e6] via-[#dcedc9] to-[#bcd9a0] text-[#3f6b1f]",
  shop: "from-[#fbf6e7] via-[#f5e8bf] to-[#e8d08a] text-[#8a6a10]",
  commercial: "from-[#eaf0fb] via-[#d4e0f6] to-[#b5c8ec] text-[#2a4a8a]",
  house: "from-[#fdeeee] via-[#f9d9d6] to-[#f0b7b1] text-[#a63a2e]",
  flat: "from-[#efeafb] via-[#ddd3f3] to-[#c3b4e6] text-[#5a3d9a]",
};

export default function TypeIcon({ type, className = "size-5" }: { type: string; className?: string }) {
  const Icon = TYPE_ICON[type] ?? LandPlot;
  return <Icon className={className} aria-hidden />;
}
