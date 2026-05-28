/* eslint-disable @typescript-eslint/naming-convention */

/**
 * Resolve the true char_start/char_end for a quote_text within documentText.
 * Accepts the LLM's reported offsets when correct; falls back to indexOf when
 * the LLM's offsets are wrong but the quote_text is verbatim in the document.
 * Returns null only when quote_text does not appear verbatim in documentText.
 */
export function resolveSubstring(
  documentText: string,
  quote: { char_end: number; char_start: number; quote_text: string },
): null | { char_end: number; char_start: number } {
  // Fast path: LLM offsets are already correct
  if (verifySubstring(documentText, quote)) {
    return { char_start: quote.char_start, char_end: quote.char_end };
  }
  // Fallback: find the verbatim text and derive correct offsets
  const idx = documentText.indexOf(quote.quote_text);
  if (idx === -1) {
    return null;
  }
  return { char_start: idx, char_end: idx + quote.quote_text.length };
}

export function verifySubstring(
  documentText: string,
  quote: { char_end: number; char_start: number; quote_text: string },
): boolean {
  if (
    quote.char_start < 0 ||
    quote.char_end > documentText.length ||
    quote.char_start > quote.char_end
  ) {
    return false;
  }
  return documentText.slice(quote.char_start, quote.char_end) === quote.quote_text;
}
