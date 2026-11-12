import { parse, type HTMLElement } from "node-html-parser";
import { fromLoose, type Loose } from "@/lib/sync/normalize";
import type { Adapter } from "@/lib/sync/types";

// Plain HTML pages, read with CSS selectors.
// config: {
//   pages: ["https://site/auctions?page=1", ...],
//   itemSelector: ".auction-card",
//   fields: { title: "h3", url: "a@href", price: ".price", area: ".area", city: ".city",
//             auctionAt: ".date", image: "img@src", emd: ".emd", description: "p" }
// }
// "selector@attr" reads an attribute instead of the text.

function read(el: HTMLElement, spec: string | undefined): string | undefined {
  if (!spec) return undefined;
  const [sel, attr] = spec.split("@");
  const node = sel ? el.querySelector(sel) : el;
  if (!node) return undefined;
  if (attr) return node.getAttribute(attr) ?? (attr === "src" ? node.getAttribute("data-src") ?? undefined : undefined);
  return node.text.replace(/\s+/g, " ").trim();
}

export const html: Adapter = async (source, fetcher) => {
  const c = source.config as { pages: string[]; itemSelector: string; fields: Record<string, string> };
  if (!c.pages?.length || !c.itemSelector || !c.fields) throw new Error("html source needs `pages`, `itemSelector` and `fields`");
  const out: Record<string, unknown>[] = [];
  for (const page of c.pages) {
    const res = await fetcher(page);
    if (!res.ok) throw new Error(`${page} answered ${res.status}`);
    const root = parse(await res.text());
    for (const el of root.querySelectorAll(c.itemSelector)) {
      const l: Loose = {};
      for (const [field, spec] of Object.entries(c.fields)) (l as Record<string, unknown>)[field] = read(el, spec);
      out.push(fromLoose(l, page));
    }
  }
  return out;
};
