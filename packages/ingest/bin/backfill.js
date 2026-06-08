import { fileURLToPath } from "node:url";

import { buildAdapterRegistry, REGISTERED_SOURCE_SLUGS } from "../src";

export async function run(argv, env) {
  const adapterIdx = argv.indexOf("--adapter");
  if (adapterIdx === -1 || argv[adapterIdx + 1] === undefined) {
    throw new Error("Usage: backfill --adapter <slug>");
  }
  const slug = argv[adapterIdx + 1];
  if (!REGISTERED_SOURCE_SLUGS.includes(slug)) {
    throw new Error(`Unknown adapter: ${slug}. Valid: ${REGISTERED_SOURCE_SLUGS.join(", ")}`);
  }
  if (!env.INNGEST_EVENT_KEY) {
    throw new Error("INNGEST_EVENT_KEY is required");
  }
  // Build registry so adapter constructor can throw early if required creds are missing.
  buildAdapterRegistry({
    acledAccessToken: env.ACLED_ACCESS_TOKEN,
    acledEmail: env.ACLED_EMAIL,
    reliefwebAppname: env.RELIEFWEB_APPNAME,
  })[slug];
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
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  run(process.argv, process.env).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
//# sourceMappingURL=backfill.js.map
