import { execSync } from "node:child_process";

// Matches `KEY=value` or `KEY="value"` — quote-stripping handles values with
// trailing quotes only; the postgres jdbc URL may contain `=` in query params.
const ENV_KEY_RE = /^([A-Z_]+)=(.*)$/;

export function setup(): void {
  // Always reset the local DB so every test run starts with a clean seed
  // and all pending migrations are applied. `db reset` uses existing Docker
  // containers (~5-10 s) — much faster than stop+start.
  try {
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    execSync("supabase db reset", { stdio: "inherit" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Only attempt `supabase start` when the stack is actually not running.
    // Any other error (partial migration failure, etc.) should propagate.
    if (!(msg.includes("not running") || msg.includes("not found") || msg.includes("ENOENT"))) {
      throw error;
    }
    // Stack not running — start the full stack (applies migrations + seed).
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    execSync("supabase start", { stdio: "inherit" });
  }

  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const statusOutput = execSync("supabase status --output env", {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  parseStatusEnv(statusOutput);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url === undefined || url === "") {
    throw new Error("supabase status did not return API_URL — is the local stack running?");
  }
}

function parseStatusEnv(output: string): void {
  for (const line of output.split("\n")) {
    const match = ENV_KEY_RE.exec(line.trim());
    if (!match) {
      continue;
    }
    const key = match[1];
    const rawValue = match[2];
    if (key === undefined || rawValue === undefined) {
      continue;
    }
    // Strip surrounding double-quotes if present (supabase status may emit them).
    const value =
      rawValue.startsWith('"') && rawValue.endsWith('"') ? rawValue.slice(1, -1) : rawValue;
    switch (key) {
      case "ANON_KEY": {
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = value;
        break;
      }
      case "API_URL": {
        process.env.NEXT_PUBLIC_SUPABASE_URL = value;
        break;
      }
      case "DB_URL": {
        process.env.POSTGRES_URL_NON_POOLING = value;
        break;
      }
      case "SERVICE_ROLE_KEY": {
        process.env.SUPABASE_SERVICE_ROLE_KEY = value;
        break;
      }
      default: {
        break;
      }
    }
  }
}
