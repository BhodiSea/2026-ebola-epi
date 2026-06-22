import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key === undefined || key.length === 0) {
    throw new Error(
      "Missing admin credential: SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server-only).",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
