import "server-only";

interface OutbreakBrief {
  body: string[];
  context: string;
  headline: string;
  slug: string;
}

export const OUTBREAK_BRIEFS: Record<string, OutbreakBrief> = {
  "bundibugyo-cod-2026-04-20": {
    slug: "bundibugyo-cod-2026-04-20",
    headline: "Bundibugyo virus disease — Ituri Province, DRC",
    body: [
      "As of 28 May 2026, the outbreak has spread to five health zones of Ituri Province. The highest burden is in Irumu, the likely site of zoonotic spillover.",
      "Ring vaccination under compassionate use is ongoing. Contact tracing coverage remains above 85% in Bunia health zone but below 60% in Mambasa due to access constraints.",
      "The case fatality ratio of 19.6% is lower than historical Bundibugyo outbreaks (25–36% for Sudan ebolavirus), consistent with prior Bundibugyo EVD data.",
    ],
    context:
      "Hand-written by the site editor. All figures link to their source sentences. Not for clinical use.",
  },
};

export function getOutbreakBrief(
  pathogenSlug: string,
  countryIso3: string,
  onsetDate: string,
): null | OutbreakBrief {
  const key = `${pathogenSlug}-${countryIso3.toLowerCase()}-${onsetDate}`;
  return OUTBREAK_BRIEFS[key] ?? null;
}
