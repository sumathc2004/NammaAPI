import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/metadata";

const paths = [
  "/",
  "/products",
  "/products/payout-api",
  "/products/payment-gateway",
  "/products/salary-bulk-payments",
  "/products/automation",
  "/solutions",
  "/developers",
  "/security",
  "/pricing",
  "/about",
  "/contact",
  "/legal/privacy",
  "/legal/terms",
  "/legal/refund-policy",
  "/legal/compliance",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return paths.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
