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
  group: LayerGroup;
  id: string;
  label: string;
}

export type LayerGroup = (typeof LAYER_GROUPS)[number];

export const LAYERS: LayerDef[] = [
  { id: "admin1", label: "Province outline", group: "Base" },
  { id: "admin2", label: "Health-zone borders", group: "Base" },
  { id: "terrain", label: "3D Terrain", group: "Base" },
  { id: "sentinel", label: "Sentinel-2 imagery", group: "Base" },
  { id: "confirmed", label: "Confirmed cases", group: "Epi data" },
  { id: "deaths", label: "Deaths", group: "Epi data" },
  { id: "attackRate", label: "Attack rate", group: "Epi data" },
  { id: "etu", label: "ETUs", group: "Operational" },
  { id: "vaccination", label: "Vaccination sites", group: "Operational" },
  { id: "acled", label: "ACLED events", group: "Operational" },
  { id: "popDensity", label: "Population density", group: "Context" },
  { id: "healthFacilities", label: "Health facilities", group: "Context" },
  { id: "travelTime", label: "Travel time", group: "Context" },
  { id: "annotations", label: "Annotations", group: "Annotations" },
  { id: "savedDefault", label: "Default view", group: "Saved views" },
];

export const DEFAULT_LAYERS = ["confirmed", "deaths", "admin1", "admin2"] as const;

export function parseLayers(raw: null | string): Set<string> {
  if (raw === null || raw === "") {
    return new Set(DEFAULT_LAYERS);
  }
  return new Set(raw.split(",").filter(Boolean));
}
