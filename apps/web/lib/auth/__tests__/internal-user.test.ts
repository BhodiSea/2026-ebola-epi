import type { User } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

function makeUser(role: unknown): null | User {
  return { app_metadata: { role } } as never;
}

// Import after mocking server-only
let isInternalUser: (user: null | User) => boolean;

beforeAll(async () => {
  ({ isInternalUser } = await import("../internal-user"));
});

describe("isInternalUser()", () => {
  it("returns false for null user", () => {
    expect(isInternalUser(null)).toBe(false);
  });

  it("returns false when app_metadata.role is undefined", () => {
    expect(isInternalUser(makeUser(undefined))).toBe(false);
  });

  it("returns false for an unrecognised role string", () => {
    expect(isInternalUser(makeUser("viewer"))).toBe(false);
  });

  it("returns false for an empty string role", () => {
    expect(isInternalUser(makeUser(""))).toBe(false);
  });

  it("returns true for admin role", () => {
    expect(isInternalUser(makeUser("admin"))).toBe(true);
  });

  it("returns true for staff role", () => {
    expect(isInternalUser(makeUser("staff"))).toBe(true);
  });
});
