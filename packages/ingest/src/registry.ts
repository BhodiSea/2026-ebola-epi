import type { RegisteredAdapter } from "./adapter.js";
import { ecdcCDTRAdapter } from "./sources/ecdc-cdtr.js";
import { whoAFROAdapter } from "./sources/who-afro.js";
import { whoDONAdapter } from "./sources/who-don.js";

export const ADAPTER_REGISTRY: Record<string, RegisteredAdapter> = {
  "ecdc-cdtr": ecdcCDTRAdapter,
  "who-afro": whoAFROAdapter,
  "who-don": whoDONAdapter,
};
