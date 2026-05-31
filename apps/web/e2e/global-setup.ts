import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

// Well-known local-stack JWTs — identical to supabase/config.toml demo values.
// No access to any real project.
/* eslint-disable no-secrets/no-secrets */
const LOCAL_SERVICE_ROLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const LOCAL_ANON_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
/* eslint-enable no-secrets/no-secrets */

const SUPABASE_URL = "http://127.0.0.1:54321";

// Stable UUID from supabase/seed.sql — quote1: "189 confirmed and 37 deaths" (WHO DON 603)
const PHASE3_DEMO_QUOTE_ID = "a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";

const ENV_KEY_RE = /^([A-Z_]+)=(.*)$/;

const ADMIN_EMAIL = "e2e-admin@ituri.test";
// Local-only test credential — not a real secret.
// eslint-disable-next-line sonarjs/no-hardcoded-passwords
const ADMIN_PASSWORD = "e2e-admin-password-local";

// Playwright globalSetup must use a default export.
// eslint-disable-next-line import-x/no-default-export
export default async function globalSetup(): Promise<void> {
  bootLocalStack();
  parseStatusEnv();
  await provisionAdminUser();
  await saveAdminStorageState();
  process.env.PHASE3_DEMO_QUOTE_ID = PHASE3_DEMO_QUOTE_ID;
}

// ─── helpers (alphabetical) ───────────────────────────────────────────────────

function bootLocalStack(): void {
  try {
    // `db reset` applies pending migrations + reloads seed (~5-10 s with existing containers).
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    execSync("supabase db reset", { stdio: "inherit" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!(msg.includes("not running") || msg.includes("not found") || msg.includes("ENOENT"))) {
      throw error;
    }
    // Stack not running — start it (applies migrations + seed on first boot).
    // eslint-disable-next-line sonarjs/no-os-command-from-path
    execSync("supabase start", { stdio: "inherit" });
  }
}

function makeCookie(name: string, value: string) {
  return {
    name,
    value,
    domain: "localhost",
    path: "/",
    expires: -1,
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
  };
}

function parseStatusEnv(): void {
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const out = execSync("supabase status --output env", {
    encoding: "utf8" as const,
    stdio: ["pipe", "pipe", "pipe"] as const,
  });

  for (const line of out.split("\n")) {
    const match = ENV_KEY_RE.exec(line.trim());
    if (!match) {
      continue;
    }
    const key = match[1];
    const rawValue = match[2];
    if (key === undefined || rawValue === undefined) {
      continue;
    }
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

async function provisionAdminUser(): Promise<void> {
  const admin = createClient(SUPABASE_URL, LOCAL_SERVICE_ROLE_JWT, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /* eslint-disable @typescript-eslint/naming-convention */
  const { error } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  /* eslint-enable @typescript-eslint/naming-convention */

  if (error !== null && !error.message.includes("already been registered")) {
    throw new Error(`Failed to create e2e admin user: ${error.message}`);
  }
}

/* eslint-disable @typescript-eslint/naming-convention */
async function saveAdminStorageState(): Promise<void> {
  const anon = createClient(SUPABASE_URL, LOCAL_ANON_JWT, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await anon.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (!data.session) {
    throw new Error(`Failed to sign in e2e admin user: ${error?.message ?? "no session"}`);
  }

  const { access_token, refresh_token } = data.session;

  const storageState = {
    cookies: [makeCookie("sb-127-auth-token", JSON.stringify([access_token, refresh_token]))],
    origins: [
      {
        origin: "http://localhost:3000",
        localStorage: [
          {
            name: "sb-127-auth-token",
            value: JSON.stringify({ access_token, refresh_token }),
          },
        ],
      },
    ],
  };

  const e2eDir = fileURLToPath(new URL(".", import.meta.url));
  const authDir = path.join(e2eDir, ".auth");
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  mkdirSync(authDir, { recursive: true });
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(path.join(authDir, "admin.json"), JSON.stringify(storageState, null, 2));
}
/* eslint-enable @typescript-eslint/naming-convention */
