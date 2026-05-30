import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/next";

import { env } from "./env";

const isDev = env.ARCJET_KEY === undefined;
const mode = isDev || process.env.NODE_ENV === "test" ? "DRY_RUN" : "LIVE";
const AJ_KEY = env.ARCJET_KEY ?? "ajkey_local_dev_00000000000000000000";

export const aj = arcjet({
  key: AJ_KEY,
  rules: [shield({ mode }), detectBot({ mode, allow: ["CATEGORY:SEARCH_ENGINE"] })],
});

export const ajInternal = arcjet({
  key: AJ_KEY,
  rules: [
    shield({ mode }),
    detectBot({ mode, allow: [] }),
    tokenBucket({ mode, refillRate: 10, interval: 60, capacity: 30 }),
  ],
});

export const ajRead = arcjet({
  key: AJ_KEY,
  rules: [shield({ mode }), detectBot({ mode, allow: ["CATEGORY:SEARCH_ENGINE"] })],
});
