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
  available: boolean;
  group: LayerGroup;
  id: string;
  label: string;
}

export type LayerGroup = (typeof LAYER_GROUPS)[number];

export const LAYERS: LayerDef[] = [
  { id: "admin1", label: "Province outline", group: "Base", available: true },
  { id: "admin2", label: "Health-zone borders", group: "Base", available: true },
  { id: "terrain", label: "3D Terrain", group: "Base", available: true },
  { id: "sentinel", label: "Sentinel-2 imagery", group: "Base", available: true },
  { id: "confirmed", label: "Confirmed cases", group: "Epi data", available: true },
  { id: "deaths", label: "Deaths", group: "Epi data", available: true },
  { id: "attackRate", label: "Attack rate", group: "Epi data", available: false },
  { id: "etu", label: "ETUs", group: "Operational", available: false },
  { id: "vaccination", label: "Vaccination sites", group: "Operational", available: false },
  { id: "acled", label: "ACLED events", group: "Operational", available: false },
  { id: "popDensity", label: "Population density", group: "Context", available: false },
  { id: "healthFacilities", label: "Health facilities", group: "Context", available: false },
  { id: "travelTime", label: "Travel time", group: "Context", available: false },
  { id: "annotations", label: "Annotations", group: "Annotations", available: false },
  { id: "savedDefault", label: "Default view", group: "Saved views", available: false },
];

export const DEFAULT_LAYERS = ["confirmed", "deaths", "admin1", "admin2"] as const;

const AVAILABLE_LAYER_IDS = new Set(LAYERS.filter((l) => l.available).map((l) => l.id));

export function parseLayers(raw: null | string): Set<string> {
  if (raw === null || raw === "") {
    return new Set(DEFAULT_LAYERS);
  }
  return new Set(raw.split(",").filter((id) => AVAILABLE_LAYER_IDS.has(id)));
}
