/* eslint-disable @typescript-eslint/naming-convention */

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
