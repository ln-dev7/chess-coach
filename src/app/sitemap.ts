import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/games", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/lessons", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/masters", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/settings", priority: 0.3, changeFrequency: "monthly" as const },
  ];

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
