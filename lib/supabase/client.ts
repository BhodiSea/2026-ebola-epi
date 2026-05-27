import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

export function createClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url === undefined || key === undefined) {
    throw new Error("Supabase env vars are not configured");
  }
  return createBrowserClient(url, key);
}
