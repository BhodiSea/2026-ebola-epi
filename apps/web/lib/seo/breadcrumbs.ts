const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ituri-epi.com";

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
      item: `${SITE_URL}${seg.path}`,
    })),
  };
}
