import type { RegisteredAdapter } from "./adapter.js";
import { acledAdapter } from "./sources/acled.js";
import { africaCDCAdapter } from "./sources/africa-cdc.js";
import { ecdcCDTRAdapter } from "./sources/ecdc-cdtr.js";
import { mohDRCAdapter } from "./sources/moh-drc.js";
import { reliefwebAdapter } from "./sources/reliefweb.js";
import { ugandaMOHAdapter } from "./sources/uganda-moh.js";
import { whoAFROAdapter } from "./sources/who-afro.js";
import { whoDONAdapter } from "./sources/who-don.js";

export const ADAPTER_REGISTRY: Record<string, RegisteredAdapter> = {
  acled: acledAdapter,
  "africa-cdc": africaCDCAdapter,
  "ecdc-cdtr": ecdcCDTRAdapter,
  "moh-drc": mohDRCAdapter,
  reliefweb: reliefwebAdapter,
  "uganda-moh": ugandaMOHAdapter,
  "who-afro": whoAFROAdapter,
  "who-don": whoDONAdapter,
};
