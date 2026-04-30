import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/data/mock/catalog";
import { SITE_URL } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPaths = [
    { path: "", changeFrequency: "weekly" as const, priority: 1.0 },
    { path: "/menu", changeFrequency: "weekly" as const, priority: 0.9 },
    { path: "/deals", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/location", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/contact", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/delivery", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/legal/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/legal/terms", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/legal/refund", changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  const productPaths = PRODUCTS.filter((p) => p.isActive).map((p) => ({
    path: `/menu/${p.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPaths, ...productPaths].map(
    ({ path, changeFrequency, priority }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    })
  );
}
