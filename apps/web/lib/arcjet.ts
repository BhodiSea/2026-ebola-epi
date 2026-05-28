import arcjet, { detectBot, shield } from "@arcjet/next";

import { env } from "./env";

const isDev = env.ARCJET_KEY === undefined;
const mode = isDev || process.env.NODE_ENV === "test" ? "DRY_RUN" : "LIVE";

export const aj = arcjet({
  key: env.ARCJET_KEY ?? "ajkey_local_dev_00000000000000000000",
  rules: [shield({ mode }), detectBot({ mode, allow: ["CATEGORY:SEARCH_ENGINE"] })],
});
