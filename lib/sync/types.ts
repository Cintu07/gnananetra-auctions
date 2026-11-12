import { z } from "zod";
import { LISTING_TYPES } from "@/db/schema";

/** What every adapter produces, whatever the source looks like. The engine validates it. */
export const rawListing = z.object({
  externalId: z.string().min(1).max(200),
  url: z.string().url().refine((u) => /^https?:\/\//i.test(u), "only http(s) links"),
  title: z.string().min(3).max(300),
  type: z.enum(LISTING_TYPES).default("land"),
  state: z.string().max(80).nullish(),
  city: z.string().max(80).nullish(),
  locality: z.string().max(120).nullish(),
  bank: z.string().max(120).nullish(),
  areaSqft: z.number().int().positive().nullish(),
  price: z.number().int().positive().nullish(),
  emd: z.number().int().positive().nullish(),
  auctionAt: z.number().int().positive().nullish(), // epoch ms
  image: z.string().url().nullish(),
  description: z.string().max(1200).nullish(),
});
export type RawListing = z.infer<typeof rawListing>;

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export type SourceDef = {
  slug: string;
  name: string;
  homepage: string;
  kind: "baanknet" | "jsonld" | "json" | "html";
  enabled: boolean;
  intervalMin?: number;
  /** adapter settings: see lib/sync/adapters */
  config: Record<string, unknown>;
};

export type Adapter = (source: SourceDef, fetcher: Fetcher) => Promise<unknown[]>;
