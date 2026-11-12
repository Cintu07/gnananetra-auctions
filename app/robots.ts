import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Closed to search engines until NEXT_PUBLIC_INDEXING=on (set when the client says go).
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_INDEXING !== "on") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/go/", "/api/"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
