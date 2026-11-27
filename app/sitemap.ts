import type { MetadataRoute } from "next";
import { UNITS } from "@/lib/units";
import { PROPERTIES } from "@/lib/properties";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = SITE.url.replace(/\/$/, "");
  const pages = ["", "/properties", "/units", "/book", "/about"].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
  const properties = PROPERTIES.map((p) => ({
    url: `${base}/properties/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));
  const units = UNITS.map((u) => ({
    url: `${base}/units/${u.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  return [...pages, ...properties, ...units];
}
