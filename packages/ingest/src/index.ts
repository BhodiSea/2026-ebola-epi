export type { Adapter, FetchResult, ParseResult, RegisteredAdapter } from "./adapter.js";
// biome-ignore lint/performance/noBarrelFile: package entry point — consumers import from @ituri/ingest
export { fetchWithConditionalGet, RateLimitedError, USER_AGENT } from "./fetch-helper.js";
export type { RegisteredSourceSlug } from "./registry.js";
export { ADAPTER_REGISTRY, REGISTERED_SOURCE_SLUGS } from "./registry.js";
export { acledAdapter } from "./sources/acled.js";
export { africaCDCAdapter } from "./sources/africa-cdc.js";
export { ecdcCDTRAdapter } from "./sources/ecdc-cdtr.js";
export { mohDRCAdapter } from "./sources/moh-drc.js";
export { reliefwebAdapter } from "./sources/reliefweb.js";
export { ugandaMOHAdapter } from "./sources/uganda-moh.js";
export { whoAFROAdapter } from "./sources/who-afro.js";
// Legacy free-function exports — kept for backward compatibility with ingest-who-don.ts
export type { ParsedDocument, WhodonItem } from "./sources/who-don.js";
export { fetchAndParseDocument, pollWHODON, whoDONAdapter } from "./sources/who-don.js";
