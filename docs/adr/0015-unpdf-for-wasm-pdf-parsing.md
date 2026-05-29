# ADR-0015: unpdf for WASM PDF parsing in the ingest package

## Status

Accepted

## Context

WHO AFRO and MoH DRC publish many situation reports as scanned or text-layer PDFs. Phase 6
requires parsing these in the same Node.js/Edge-compatible environment as the rest of the
ingest pipeline. Existing HTML parsing (`@mozilla/readability` + `jsdom`) cannot process PDFs.

Options considered:

| Option | Why rejected |
|---|---|
| `pdf-parse` | Wraps C++ `libpoppler`; native binary, not edge-safe, known security CVEs |
| `pdfjs-dist` (direct) | 4 MB+ bundle; complex canvas/worker setup for Node |
| `pdf-oxide` | Rust library; **no published npm package** (doc explicitly forbids it) |
| `unpdf` | WASM wrapper around Mozilla's PDF.js (`pdfjs-dist`); Node/Edge-safe; ~1.5 MB; actively maintained |

## Decision

Add `unpdf` as a dependency of `@ituri/ingest`. It is used exclusively as a fallback when
`@mozilla/readability` cannot extract text (e.g. PDF MIME type or failed parse). HTML documents
continue to use the existing Readability path.

Usage is gated: adapters call `unpdf` only when `mimeType` starts with `application/pdf` or when
the Readability parse returns null on content that looks like PDF-encoded text.

## Consequences

- `pnpm add unpdf` in `packages/ingest`.
- Bundle size increase: ~1.5 MB WASM loaded on first PDF parse (lazy import keeps cold-start cost
  from affecting HTML-only paths).
- License: MIT. No redistribution restrictions.
- No new backend infrastructure required.
