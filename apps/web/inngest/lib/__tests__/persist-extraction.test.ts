// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAdminCode } from "../persist-extraction";
import type { Tx } from "@/lib/db";

vi.mock("server-only", () => ({}));

// Mock env before any module that reads it is imported.
vi.mock("@/lib/env", () => ({ env: { ANTHROPIC_API_KEY: "test-key" } }));
vi.mock("@/lib/db", () => ({ db: {} }));

// ─── resolveAdminCode ─────────────────────────────────────────────────────────
// Tests verify the two-level admin resolution logic:
//   1. admin2 (zone de santé) exact match takes priority
//   2. admin1 (province) is tried when no admin2 match
//   3. both null when neither matches

/** Build a minimal mock Drizzle tx that returns admin2Result on first select,
 *  admin1Result on second select (the fallback branch). */
function makeTx(
  admin2Result: { admin1Code: string; code: string }[],
  admin1Result: { code: string }[],
  insertValuesSpy = vi.fn().mockResolvedValue([]),
): { insertValuesSpy: ReturnType<typeof vi.fn>; tx: Tx } {
  let selectCallN = 0;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- partial mock for unit test; full Tx type not needed
  const tx = {
    select: vi.fn().mockImplementation(() => {
      const n = ++selectCallN;
      const resolvedResult = n === 1 ? admin2Result : admin1Result;
      const limit = vi.fn().mockResolvedValue(resolvedResult);
      const where = vi.fn().mockReturnValue({ limit });
      const innerJoin = vi.fn().mockReturnValue({ where });
      return {
        from: vi.fn().mockReturnValue({ innerJoin, where }),
      };
    }),
    insert: vi.fn().mockReturnValue({ values: insertValuesSpy }),
  } as unknown as Tx;
  return { tx, insertValuesSpy };
}

describe("resolveAdminCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns admin2Code when zone name matches case-insensitively", async () => {
    const { tx } = makeTx([{ code: "COD-IT-RW", admin1Code: "COD-IT" }], []);
    const result = await resolveAdminCode(tx, "COD", "rwampara");
    expect(result).toEqual({ admin2Code: "COD-IT-RW", admin1Code: "COD-IT" });
  });

  it("returns admin1Code when no zone matches but province name matches", async () => {
    const { tx } = makeTx([], [{ code: "COD-IT" }]);
    const result = await resolveAdminCode(tx, "COD", "Ituri");
    expect(result).toEqual({ admin2Code: null, admin1Code: "COD-IT" });
  });

  it("returns both null when neither zone nor province matches", async () => {
    const { tx } = makeTx([], []);
    const result = await resolveAdminCode(tx, "COD", "UnknownPlace");
    expect(result).toEqual({ admin2Code: null, admin1Code: null });
  });
});
