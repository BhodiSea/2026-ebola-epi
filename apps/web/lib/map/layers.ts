/** Shared layer catalogue for the /map command center. Consumed by LayerRail (checkboxes)
 *  and MapClientShell/MapPane (visibility). Layers without backing data yet (Phase 6) still
 *  render a toggle — the spec keeps the control present while the data lands later. */

export const LAYER_GROUPS = [
  "Base",
  "Epi data",
  "Operational",
  "Context",
  "Annotations",
  "Saved views",
] as const;

export interface LayerDef {
  data: "live" | "stub";
  group: LayerGroup;
  id: string;
  label: string;
}

export type LayerGroup = (typeof LAYER_GROUPS)[number];

export const LAYERS: LayerDef[] = [
  { id: "admin1", label: "Province outline", group: "Base", data: "live" },
  { id: "admin2", label: "Health-zone borders", group: "Base", data: "live" },
  { id: "terrain", label: "3D Terrain", group: "Base", data: "live" },
  { id: "sentinel", label: "Sentinel-2 imagery", group: "Base", data: "live" },
  { id: "confirmed", label: "Confirmed cases", group: "Epi data", data: "live" },
  { id: "deaths", label: "Deaths", group: "Epi data", data: "live" },
  { id: "attackRate", label: "Attack rate", group: "Epi data", data: "stub" },
  { id: "etu", label: "ETUs", group: "Operational", data: "stub" },
  { id: "vaccination", label: "Vaccination sites", group: "Operational", data: "stub" },
  { id: "acled", label: "ACLED events", group: "Operational", data: "stub" },
  { id: "popDensity", label: "Population density", group: "Context", data: "stub" },
  { id: "healthFacilities", label: "Health facilities", group: "Context", data: "stub" },
  { id: "travelTime", label: "Travel time", group: "Context", data: "stub" },
  { id: "annotations", label: "Annotations", group: "Annotations", data: "stub" },
  { id: "savedDefault", label: "Default view", group: "Saved views", data: "stub" },
];

export const DEFAULT_LAYERS = ["confirmed", "deaths", "admin1", "admin2"] as const;

export function parseLayers(raw: null | string): Set<string> {
  if (raw === null || raw === "") {
    return new Set(DEFAULT_LAYERS);
  }
  return new Set(raw.split(",").filter(Boolean));
}
