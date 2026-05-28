import arcjet, { detectBot, shield } from "@arcjet/next";

import { env } from "./env";

export const aj = arcjet({
  key: env.ARCJET_KEY,
  rules: [
    shield({
      mode: process.env.NODE_ENV === "test" ? "DRY_RUN" : "LIVE",
    }),
    detectBot({
      mode: process.env.NODE_ENV === "test" ? "DRY_RUN" : "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE"],
    }),
  ],
});
