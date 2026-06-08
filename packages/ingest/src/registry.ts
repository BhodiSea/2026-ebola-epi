import type { RegisteredAdapter } from "./adapter.js";
import { makeAcledAdapter } from "./sources/acled.js";
import { africaCDCAdapter } from "./sources/africa-cdc.js";
import { ecdcCDTRAdapter } from "./sources/ecdc-cdtr.js";
import { mohDRCAdapter } from "./sources/moh-drc.js";
import { makeReliefwebAdapter } from "./sources/reliefweb.js";
import { ugandaMOHAdapter } from "./sources/uganda-moh.js";
import { whoAFROAdapter } from "./sources/who-afro.js";
import { whoDONAdapter } from "./sources/who-don.js";

export const REGISTERED_SOURCE_SLUGS = [
  "acled",
  "africa-cdc",
  "ecdc-cdtr",
  "moh-drc",
  "reliefweb",
  "uganda-moh",
  "who-afro",
  "who-don",
] as const;

export interface AdapterRegistryCreds {
  acledAccessToken?: string | undefined;
  acledEmail?: string | undefined;
  reliefwebAppname?: string | undefined;
}

export type RegisteredSourceSlug = (typeof REGISTERED_SOURCE_SLUGS)[number];

export function buildAdapterRegistry(
  creds: AdapterRegistryCreds,
): Record<RegisteredSourceSlug, RegisteredAdapter> {
  return {
    acled: makeAcledAdapter({ accessToken: creds.acledAccessToken, email: creds.acledEmail }),
    "africa-cdc": africaCDCAdapter,
    "ecdc-cdtr": ecdcCDTRAdapter,
    "moh-drc": mohDRCAdapter,
    reliefweb: makeReliefwebAdapter({ appname: creds.reliefwebAppname }),
    "uganda-moh": ugandaMOHAdapter,
    "who-afro": whoAFROAdapter,
    "who-don": whoDONAdapter,
  };
}

// Backward-compat singleton — singletons read from process.env at call time.
export const ADAPTER_REGISTRY: Record<RegisteredSourceSlug, RegisteredAdapter> =
  buildAdapterRegistry({});
