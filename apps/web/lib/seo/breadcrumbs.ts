import { siteUrl } from "@/lib/env";

export interface BreadcrumbSegment {
  label: string;
  path: string;
}

export function buildBreadcrumbs(segments: BreadcrumbSegment[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: segments.map((seg, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: seg.label,
      item: `${siteUrl()}${seg.path}`,
    })),
  };
}
