export type { Adapter, FetchResult, ParseResult, RegisteredAdapter } from "./adapter.js";
// biome-ignore lint/performance/noBarrelFile: package entry point — consumers import from @ituri/ingest
export { ConfiguredSkipError } from "./configured-skip-error.js";
export { fetchWithConditionalGet, RateLimitedError, USER_AGENT } from "./fetch-helper.js";
export type { AdapterRegistryCreds, RegisteredSourceSlug } from "./registry.js";
export { ADAPTER_REGISTRY, buildAdapterRegistry, REGISTERED_SOURCE_SLUGS } from "./registry.js";
export type { AcledCreds } from "./sources/acled.js";
export { acledAdapter, makeAcledAdapter } from "./sources/acled.js";
export { africaCDCAdapter } from "./sources/africa-cdc.js";
export { ecdcCDTRAdapter } from "./sources/ecdc-cdtr.js";
export { mohDRCAdapter } from "./sources/moh-drc.js";
export type { ReliefwebCreds } from "./sources/reliefweb.js";
export { makeReliefwebAdapter, reliefwebAdapter } from "./sources/reliefweb.js";
export { ugandaMOHAdapter } from "./sources/uganda-moh.js";
export { whoAFROAdapter } from "./sources/who-afro.js";
// Legacy free-function exports — kept for backward compatibility with ingest-who-don.ts
export type { ParsedDocument, WhodonItem } from "./sources/who-don.js";
export { fetchAndParseDocument, pollWHODON, whoDONAdapter } from "./sources/who-don.js";
