import "server-only";

export interface DailyBrief {
  body: string[];
  context: string;
  date: string;
  headline: string;
}

export const DAILY_BRIEF: DailyBrief = {
  date: "2026-05-28",
  headline: "Bundibugyo virus disease — Ituri Province, DRC",
  body: [
    "As of 28 May 2026, the outbreak declared on 20 April continues to be concentrated in five health zones of Ituri Province. Irumu remains the epicentre with 98 confirmed cases, accounting for approximately 52% of the total case burden.",
    "The case fatality ratio stands at 19.6%, which is consistent with historical Bundibugyo virus outbreaks (typically 25–36% for Sudan ebolavirus; lower for Bundibugyo). Ring vaccination with the rVSV-ZEBOV candidate is ongoing under compassionate use protocols.",
    "The geographic pattern — heavily weighted toward Irumu and Mambasa — reflects the initial zoonotic spillover event near the Ituri Forest margin. Community transmission has not been confirmed in Bunia urban area, though contact tracing is ongoing.",
    "Response capacity remains stretched. Access to Mambasa health zone requires air transport, limiting rapid response team deployment.",
  ],
  context:
    "This summary is hand-written by the site editor and updated when new WHO/MoH data is released. All figures below are extracted directly from source documents. Hover any number to see the exact source sentence.",
};
