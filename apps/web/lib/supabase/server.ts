import { createServerClient } from "@supabase/ssr";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * Don't put this client in a global variable (Fluid Compute).
 * Always create a new client within each function.
 */
export async function createClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url === undefined || key === undefined) {
    throw new Error("Supabase env vars are not configured");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
          // eslint-disable-next-line no-restricted-syntax -- Server Component cookie write is a no-op; proxy.ts handles session refresh
        } catch {
          /* intentional: cookie.set() throws in Server Components; the proxy refreshes the session */
        }
      },
    },
  });
}

/** Cookie-less client for generateStaticParams / sitemap.ts (build time, no request context). */
export function createStaticClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url === undefined || key === undefined) {
    throw new Error("Supabase env vars are not configured");
  }
  return createJsClient(url, key);
}
