import "server-only";

import type { User } from "@supabase/supabase-js";

export const INTERNAL_ROLES = ["admin", "staff"] as const;
export type InternalRole = (typeof INTERNAL_ROLES)[number];

export function isInternalUser(user: null | User): boolean {
  if (user === null) {
    return false;
  }
  const role: unknown = user.app_metadata.role;
  return (INTERNAL_ROLES as readonly unknown[]).includes(role);
}
