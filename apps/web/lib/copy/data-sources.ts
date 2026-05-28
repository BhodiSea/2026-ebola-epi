import "server-only";

export interface SourcePosture {
  attribution: string;
  displayName: string;
  licenseTier: "display_only" | "excluded" | "noncommercial_verified" | "open";
  slug: string;
  terms: string;
}

export const DATA_SOURCE_POSTURES: Record<string, SourcePosture> = {
  "who-don": {
    slug: "who-don",
    displayName: "WHO Disease Outbreak News",
    licenseTier: "open",
    terms:
      "WHO DON reports are published under the WHO Copyright Policy, which allows free reproduction with attribution for non-commercial purposes. Full text, case counts, and derived aggregates may be displayed.",
    attribution: "© World Health Organization",
  },
  "who-afro": {
    slug: "who-afro",
    displayName: "WHO AFRO Situation Reports",
    licenseTier: "open",
    terms:
      "WHO AFRO situation reports are released as public documents. Reproduction with attribution is permitted for educational and public-health purposes.",
    attribution: "© WHO Regional Office for Africa",
  },
  ecdc: {
    slug: "ecdc",
    displayName: "ECDC Rapid Risk Assessments",
    licenseTier: "open",
    terms:
      "ECDC publications are released under a custom open licence permitting reproduction with attribution. Derived statistics and quoted figures may be displayed.",
    attribution: "© European Centre for Disease Prevention and Control",
  },
  "africa-cdc": {
    slug: "africa-cdc",
    displayName: "Africa CDC Outbreak Bulletins",
    licenseTier: "noncommercial_verified",
    terms:
      "Africa CDC bulletins are publicly released but the licence restricts redistribution for commercial purposes. Aggregated figures are displayed for situational awareness; full-text redistribution is excluded.",
    attribution: "© Africa Centres for Disease Control and Prevention",
  },
  reliefweb: {
    slug: "reliefweb",
    displayName: "ReliefWeb Situation Reports",
    licenseTier: "display_only",
    terms:
      "ReliefWeb content is sourced from multiple organisations with varying licences. ituri-sitrep displays aggregated metadata only and links to the original document. Full text and extracts are not redistributed.",
    attribution: "© respective originating organisations via ReliefWeb",
  },
  hdx: {
    slug: "hdx",
    displayName: "HDX Humanitarian Data Exchange",
    licenseTier: "open",
    terms:
      "HDX datasets carry individual Creative Commons licences per dataset — predominantly CC BY 4.0 or CC BY-IGO. Only datasets with open licences are ingested; licence metadata is preserved on every extracted figure.",
    attribution: "© respective data contributors via HDX",
  },
};

export function getSourcePosture(slug: string): null | SourcePosture {
  return DATA_SOURCE_POSTURES[slug] ?? null;
}
