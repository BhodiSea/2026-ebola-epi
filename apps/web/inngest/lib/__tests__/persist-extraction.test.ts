// @vitest-environment node
// G-11: upsertDocument uploads rawBytes to source-bytes Storage bucket.

import type { ExtractionRow } from "@ituri/extract";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveAdminCode,
  upsertDocument,
  upsertOutbreak,
  upsertSourceQuote,
} from "../persist-extraction";
import type { Tx } from "@/lib/db";

vi.mock("server-only", () => ({}));

// Mock env before any module that reads it is imported.
vi.mock("@/lib/env", () => ({ env: { ANTHROPIC_API_KEY: "test-key" } }));

// --- db + admin mocks (vi.hoisted so factories can reference them) -------------
const { mockDbInsert, mockDbSelect, mockStorageFrom, mockStorageUpload } = vi.hoisted(() => {
  const mockStorageUploadHoisted = vi.fn();
  const mockStorageFromHoisted = vi.fn();
  return {
    mockDbSelect: vi.fn(),
    mockDbInsert: vi.fn(),
    mockStorageUpload: mockStorageUploadHoisted,
    mockStorageFrom: mockStorageFromHoisted,
  };
});

vi.mock("@/lib/db", () => ({ db: { insert: mockDbInsert, select: mockDbSelect } }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({ storage: { from: mockStorageFrom } }),
}));

// --- resolveAdminCode ---------------------------------------------------------

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

// --- upsertOutbreak -----------------------------------------------------------
// The implementation must be a single atomic INSERT … ON CONFLICT (pathogen_icd11, country_iso3)
// DO UPDATE RETURNING id — no prior SELECT, no separate UPDATE statement.
// Migration 20260608120000 changes the constraint from triple to pair to match.
//
// Structural guarantees verified:
//   1. tx.select is never called (no SELECT-then-INSERT race)
//   2. pathogen_slug is derived from PATHOGEN_SLUG[icd11] (P0b)
//   3. severity_level defaults to "alert" (P0b)
//   4. Returns the id from the RETURNING clause

const BUNDIBUGYO_ROW: ExtractionRow = {
  pathogen_icd11: "1D60.2",
  country_iso3: "COD",
  metric: "cases",
  value: 42,
  as_of: "2026-04-20",
  source_quote: { char_start: 0, char_end: 10, quote_text: "42 cases" },
};

function makeOutbreakTx(returnedId = "aaaaaaaa-0000-0000-0000-000000000001"): {
  capturedValues: Record<string, unknown>[];
  insertSpy: ReturnType<typeof vi.fn>;
  onConflictDoUpdateSpy: ReturnType<typeof vi.fn>;
  selectSpy: ReturnType<typeof vi.fn>;
  tx: Tx;
} {
  const capturedValues: Record<string, unknown>[] = [];

  const returningSpy = vi.fn().mockResolvedValue([{ id: returnedId }]);
  const onConflictDoUpdateSpy = vi.fn().mockReturnValue({ returning: returningSpy });
  const valuesSpy = vi.fn().mockImplementation((vals: Record<string, unknown>) => {
    capturedValues.push(vals);
    return { onConflictDoUpdate: onConflictDoUpdateSpy };
  });
  const insertSpy = vi.fn().mockReturnValue({ values: valuesSpy });
  // select is intentionally not mocked — any call to it throws, proving the
  // implementation does not do a SELECT-then-INSERT
  const selectSpy = vi.fn().mockImplementation(() => {
    throw new Error("upsertOutbreak must not call tx.select — use atomic INSERT ON CONFLICT");
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- partial mock
  const tx = { insert: insertSpy, select: selectSpy } as unknown as Tx;
  return { tx, insertSpy, onConflictDoUpdateSpy, selectSpy, capturedValues };
}

describe("upsertOutbreak", () => {
  const onsetDate = new Date("2026-04-20T00:00:00Z");

  it("does not call tx.select (atomic upsert, no race window)", async () => {
    const { tx, selectSpy } = makeOutbreakTx();
    await upsertOutbreak(tx, BUNDIBUGYO_ROW, onsetDate);
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it("sets pathogen_slug to 'bundibugyo' for ICD-11 code 1D60.2 (P0b)", async () => {
    const { tx, capturedValues } = makeOutbreakTx();
    await upsertOutbreak(tx, BUNDIBUGYO_ROW, onsetDate);
    expect(capturedValues[0]?.pathogenSlug).toBe("bundibugyo");
  });

  it("sets severity_level to 'alert' by default (P0b)", async () => {
    const { tx, capturedValues } = makeOutbreakTx();
    await upsertOutbreak(tx, BUNDIBUGYO_ROW, onsetDate);
    expect(capturedValues[0]?.severityLevel).toBe("alert");
  });

  it("returns the id from the RETURNING clause", async () => {
    const expectedId = "bbbbbbbb-1111-1111-1111-000000000002";
    const { tx } = makeOutbreakTx(expectedId);
    const result = await upsertOutbreak(tx, BUNDIBUGYO_ROW, onsetDate);
    expect(result).toBe(expectedId);
  });

  it("backfills null severity_level on conflict — set clause includes severityLevel (P0b)", async () => {
    const { tx, onConflictDoUpdateSpy } = makeOutbreakTx();
    await upsertOutbreak(tx, BUNDIBUGYO_ROW, onsetDate);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test mock; vi.fn() call args typed as unknown[][]
    const conflictArg = onConflictDoUpdateSpy.mock.calls[0] as [{ set: Record<string, unknown> }];
    expect(conflictArg[0].set).toHaveProperty("severityLevel");
  });

  it("unknown ICD-11 code produces null pathogen_slug (graceful degradation)", async () => {
    const unknownRow: ExtractionRow = {
      ...BUNDIBUGYO_ROW,
      pathogen_icd11: "ZZ99.9",
    };
    const { tx, capturedValues } = makeOutbreakTx();
    await upsertOutbreak(tx, unknownRow, onsetDate);
    expect(capturedValues[0]?.pathogenSlug).toBeNull();
  });
});

// --- upsertSourceQuote --------------------------------------------------------
// NEW-P2q: source_quotes (document_id, char_start, char_end) unique index.
// When the INSERT conflicts, falls back to SELECT for the existing row id.

function makeSourceQuoteTx(opts: { existingId?: string; insertedId?: string }): { tx: Tx } {
  const { insertedId, existingId } = opts;

  const returningInsertSpy = vi
    .fn()
    .mockResolvedValue(insertedId === undefined ? [] : [{ id: insertedId }]);
  const onConflictDoNothingSpy = vi.fn().mockReturnValue({ returning: returningInsertSpy });
  const insertValuesSpy = vi.fn().mockReturnValue({ onConflictDoNothing: onConflictDoNothingSpy });
  const insertSpy = vi.fn().mockReturnValue({ values: insertValuesSpy });

  const limit1Spy = vi.fn().mockResolvedValue(existingId === undefined ? [] : [{ id: existingId }]);
  const whereSpy = vi.fn().mockReturnValue({ limit: limit1Spy });
  const fromSpy = vi.fn().mockReturnValue({ where: whereSpy });
  const selectSpy = vi.fn().mockReturnValue({ from: fromSpy });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- partial mock
  const tx = { insert: insertSpy, select: selectSpy } as unknown as Tx;
  return { tx };
}

describe("upsertSourceQuote (NEW-P2q)", () => {
  const DOC_ID = "doc-aaaa-0000";
  const CHAR_START = 10;
  const CHAR_END = 42;
  const QUOTE_TEXT = "18 confirmed cases";

  const SQ_PARAMS = {
    charEnd: CHAR_END,
    charStart: CHAR_START,
    documentId: DOC_ID,
    quoteText: QUOTE_TEXT,
  };

  it("returns the inserted id when there is no conflict", async () => {
    const { tx } = makeSourceQuoteTx({ insertedId: "sq-new-1111" });
    const id = await upsertSourceQuote(tx, SQ_PARAMS);
    expect(id).toBe("sq-new-1111");
  });

  it("falls back to SELECT and returns existing id when insert returns no rows (conflict)", async () => {
    const { tx } = makeSourceQuoteTx({ existingId: "sq-existing-2222" });
    const id = await upsertSourceQuote(tx, SQ_PARAMS);
    expect(id).toBe("sq-existing-2222");
  });

  it("throws when both insert and fallback SELECT find nothing", async () => {
    const { tx } = makeSourceQuoteTx({});
    await expect(upsertSourceQuote(tx, SQ_PARAMS)).rejects.toThrow("source_quote");
  });
});

// --- upsertDocument — rawBytes storage (G-11) --------------------------------
// upsertDocument uploads rawBytes to the source-bytes Storage bucket when:
//   - rawBytes is provided
//   - the document INSERT succeeds (not a dupe)
// Early-return path (dupe) and absent rawBytes both skip the upload.

const SHA256 = Buffer.alloc(32);
const SHA256_HEX = "0".repeat(64);
const RAW_BYTES = Buffer.from("<html>"); // Uint8Array subtype; avoids unicorn/number-literal-case
const MIME_HTML = "text/html";
const MIME_PDF = "application/pdf";
const DOC_BASE = {
  fullText: "full text",
  publishedAt: new Date("2026-04-20T00:00:00Z"),
  sha256: SHA256,
  sourceId: "src-uuid-001",
  url: "https://who.int/doc.html",
  mimeType: MIME_HTML,
};

function setupDocumentDb(opts: { dupeExists: boolean; insertReturns: boolean }): void {
  const { dupeExists, insertReturns } = opts;
  // Dupe-check SELECT
  const dupeLimit = vi.fn().mockResolvedValue(dupeExists ? [{ id: "dupe-doc-id" }] : []);
  const dupeWhere = vi.fn().mockReturnValue({ limit: dupeLimit });
  mockDbSelect.mockReturnValue({ from: vi.fn().mockReturnValue({ where: dupeWhere }) });
  if (dupeExists) {
    return;
  }
  // INSERT … ON CONFLICT DO NOTHING … RETURNING
  const insReturning = vi.fn().mockResolvedValue(insertReturns ? [{ id: "new-doc-id" }] : []);
  const insOnConflict = vi.fn().mockReturnValue({ returning: insReturning });
  const insValues = vi.fn().mockReturnValue({ onConflictDoNothing: insOnConflict });
  mockDbInsert.mockReturnValue({ values: insValues });
}

describe("upsertDocument — rawBytes storage (G-11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageUpload.mockResolvedValue({ data: { path: "ok" }, error: null });
    mockStorageFrom.mockReturnValue({ upload: mockStorageUpload });
  });

  it("uploads rawBytes to source-bytes on new document insert", async () => {
    setupDocumentDb({ dupeExists: false, insertReturns: true });
    await upsertDocument({ ...DOC_BASE, rawBytes: RAW_BYTES });
    expect(mockStorageFrom).toHaveBeenCalledWith("source-bytes");
    expect(mockStorageUpload).toHaveBeenCalledWith(
      `${SHA256_HEX}.html`,
      RAW_BYTES,
      expect.objectContaining({ contentType: MIME_HTML }),
    );
  });

  it("skips storage upload when rawBytes is absent", async () => {
    setupDocumentDb({ dupeExists: false, insertReturns: true });
    await upsertDocument(DOC_BASE);
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("skips storage upload when document already exists (dupe early return)", async () => {
    setupDocumentDb({ dupeExists: true, insertReturns: false });
    await upsertDocument({ ...DOC_BASE, rawBytes: RAW_BYTES });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("uses .pdf extension for application/pdf mimeType", async () => {
    setupDocumentDb({ dupeExists: false, insertReturns: true });
    await upsertDocument({ ...DOC_BASE, mimeType: MIME_PDF, rawBytes: RAW_BYTES });
    expect(mockStorageUpload).toHaveBeenCalledWith(
      `${SHA256_HEX}.pdf`,
      RAW_BYTES,
      expect.objectContaining({ contentType: MIME_PDF }),
    );
  });
});
