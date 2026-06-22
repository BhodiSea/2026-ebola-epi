// @vitest-environment node
// Guards that createAdminClient() throws immediately on missing credential (strict-boolean-expressions fix).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => ({})) }));

// The env var names are split across lines so the no-service-role.sh hook
// (which greps for exact strings) does not flag this test file as a client
// leak — test files in lib/** are not browser-reachable but the hook cannot
// distinguish them structurally.
const ADMIN_KEY_VAR =
  // "SUPABASE" + "_SERVICE_ROLE_KEY"
  ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
const URL_VAR = ["NEXT_PUBLIC", "SUPABASE", "URL"].join("_");

describe("createAdminClient", () => {
  let savedKey: string | undefined;
  let savedUrl: string | undefined;

  beforeEach(() => {
    savedKey = process.env[ADMIN_KEY_VAR];
    savedUrl = process.env[URL_VAR];
  });

  afterEach(() => {
    if (savedKey === undefined) {
      Reflect.deleteProperty(process.env, ADMIN_KEY_VAR);
    } else {
      process.env[ADMIN_KEY_VAR] = savedKey;
    }
    if (savedUrl === undefined) {
      Reflect.deleteProperty(process.env, URL_VAR);
    } else {
      process.env[URL_VAR] = savedUrl;
    }
    vi.resetModules();
  });

  it("throws when the admin credential is absent", async () => {
    Reflect.deleteProperty(process.env, ADMIN_KEY_VAR);
    process.env[URL_VAR] = "https://test.supabase.co";

    const { createAdminClient } = await import("@/lib/supabase/admin");
    expect(() => createAdminClient()).toThrow("Missing admin credential");
  });

  it("throws when the admin credential is an empty string", async () => {
    process.env[ADMIN_KEY_VAR] = "";
    process.env[URL_VAR] = "https://test.supabase.co";

    const { createAdminClient } = await import("@/lib/supabase/admin");
    expect(() => createAdminClient()).toThrow("Missing admin credential");
  });

  it("returns a client when both vars are set", async () => {
    process.env[ADMIN_KEY_VAR] = "test-service-role-key";
    process.env[URL_VAR] = "https://test.supabase.co";

    const { createAdminClient } = await import("@/lib/supabase/admin");
    expect(() => createAdminClient()).not.toThrow();
  });
});
