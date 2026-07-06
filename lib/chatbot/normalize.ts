/**
 * Direct TypeScript port of `IntentPhrase::normalize()` from the Laravel app.
 * Lowercases, strips everything except a-z/0-9/whitespace, collapses runs of
 * whitespace into a single space, and trims.
 */
export function normalizeText(text: string): string {
  const lowered = text.toLowerCase();
  const stripped = lowered.replace(/[^a-z0-9\s]/g, "");
  const collapsed = stripped.replace(/\s+/g, " ");
  return collapsed.trim();
}

/**
 * Port of the tokenizer used throughout IntentMatcher/ConversationEngine:
 * split on spaces, drop tokens of length <= 1.
 */
export function tokenize(normalized: string): string[] {
  return normalized.split(" ").filter((token) => token.length > 1);
}
