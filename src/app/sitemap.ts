import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  return [
    "/",
    "/calendar",
    "/me",
    "/friends",
    "/login",
    "/settings/reminder",
    "/non-medical",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: path === "/" ? 1 : 0.7,
  }));
}
