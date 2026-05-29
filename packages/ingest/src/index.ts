export type { Adapter, FetchResult, ParseResult, RegisteredAdapter } from "./adapter.js";
// biome-ignore lint/performance/noBarrelFile: package entry point — consumers import from @ituri/ingest
export { fetchWithConditionalGet, RateLimitedError, USER_AGENT } from "./fetch-helper.js";
export { ADAPTER_REGISTRY } from "./registry.js";
export { ecdcCDTRAdapter } from "./sources/ecdc-cdtr.js";
export { whoAFROAdapter } from "./sources/who-afro.js";
// Legacy free-function exports — kept for backward compatibility with ingest-who-don.ts
export type { ParsedDocument, WhodonItem } from "./sources/who-don.js";
export { fetchAndParseDocument, pollWHODON, whoDONAdapter } from "./sources/who-don.js";
