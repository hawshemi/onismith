import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // Crawlers must reach editor pages to see their noindex metadata.
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}sitemap.xml`,
  };
}
