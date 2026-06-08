import { fileURLToPath } from "node:url";

import type { RegisteredSourceSlug } from "..";
import { buildAdapterRegistry, REGISTERED_SOURCE_SLUGS } from "..";

/* eslint-disable @typescript-eslint/naming-convention -- env var names follow OS/Node.js UPPER_CASE convention */
interface BackfillEnv {
  ACLED_ACCESS_TOKEN?: string;
  ACLED_EMAIL?: string;
  INNGEST_BASE_URL?: string;
  INNGEST_EVENT_KEY?: string;
  RELIEFWEB_APPNAME?: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

export async function run(argv: string[], env: BackfillEnv): Promise<void> {
  const adapterIdx = argv.indexOf("--adapter");
  const maybeSlug = adapterIdx === -1 ? undefined : argv[adapterIdx + 1];
  if (maybeSlug === undefined) {
    throw new Error("Usage: backfill --adapter <slug>");
  }
  const slug = maybeSlug;

  if (!(REGISTERED_SOURCE_SLUGS as readonly string[]).includes(slug)) {
    throw new Error(`Unknown adapter: ${slug}. Valid: ${REGISTERED_SOURCE_SLUGS.join(", ")}`);
  }

  if (env.INNGEST_EVENT_KEY === undefined || env.INNGEST_EVENT_KEY === "") {
    throw new Error("INNGEST_EVENT_KEY is required");
  }

  // Build registry so adapter constructors can throw early on missing required creds.
  const registry = buildAdapterRegistry({
    acledAccessToken: env.ACLED_ACCESS_TOKEN,
    acledEmail: env.ACLED_EMAIL,
    reliefwebAppname: env.RELIEFWEB_APPNAME,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions, @typescript-eslint/no-unsafe-type-assertion -- fire-and-forget credential check; slug verified by REGISTERED_SOURCE_SLUGS.includes above
  registry[slug as RegisteredSourceSlug];

  const baseUrl = env.INNGEST_BASE_URL ?? "https://inn.gs";
  const eventName = `ingest/${slug}.poll`;

  const res = await fetch(`${baseUrl}/e/${env.INNGEST_EVENT_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: eventName, data: {} }),
  });

  if (!res.ok) {
    throw new Error(`Inngest event send failed: ${res.status} ${await res.text()}`);
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- conventional Node.js ESM main-module detection variable name
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  // eslint-disable-next-line unicorn/prefer-top-level-await -- conditional guard; top-level await cannot be inside an if block; process.env satisfies BackfillEnv
  run(process.argv, process.env as BackfillEnv).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    // eslint-disable-next-line unicorn/no-process-exit -- CLI entry point; non-zero exit code required for shell error propagation
    process.exit(1);
  });
}
