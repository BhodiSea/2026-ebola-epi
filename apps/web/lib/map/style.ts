/** MapLibre style URLs — keyless, Carto public CDN. */

export const STYLE_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
export const STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Terrain raster-dem source (Copernicus GLO-30, Terrarium encoding, MIT-packaged). */
export const TERRAIN_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

/** Sentinel-2 cloudless mosaic (EOX, keyless, CC-BY-4.0) — optional aerial drape. */
export const SENTINEL_TILES =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg";
export const SENTINEL_ATTRIBUTION = "Sentinel-2 cloudless — https://s2maps.eu by EOX (CC-BY-4.0)";

/** Choose a style based on the current data-theme attribute value. */
export function resolveStyle(theme: string | undefined): string {
  return theme === "dark" ? STYLE_DARK : STYLE_LIGHT;
}
