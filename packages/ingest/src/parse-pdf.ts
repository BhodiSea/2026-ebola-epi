import { extractText } from "unpdf";

import type { ParseResult } from "./adapter.js";

// Same threshold as africa-cdc MIN_READABLE_CHARS, adjusted for PDF text density.
const MIN_PDF_TEXT_CHARS = 100;

/**
 * Extract plain text from a PDF buffer using unpdf (WASM PDF.js wrapper).
 *
 * The returned fullText is the verbatim string stored in documents.full_text.
 * The DB trigger tg_verify_quote_substring enforces char-offset fidelity:
 * substring(full_text, char_start+1, len) must equal source_quote.quote_text.
 *
 * Risk: multi-column layouts and OCR artifacts can desync LLM-quoted offsets.
 * Validated by the opt-in integration test (PDF_LIVE_TEST=1).
 */
export async function parsePdf(rawBytes: Uint8Array, language = "en"): Promise<ParseResult> {
  const { text } = await extractText(rawBytes);
  const fullText = text.join("\n");

  if (fullText.trim().length < MIN_PDF_TEXT_CHARS) {
    return { skipped: true, reason: "pdf_text_empty" };
  }

  return {
    skipped: false,
    fullText,
    title: "",
    language,
  };
}
