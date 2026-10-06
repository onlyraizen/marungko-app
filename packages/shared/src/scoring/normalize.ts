/**
 * Canonical form for comparing what a child said against what was expected.
 * Used by both the app (instant feedback) and the backend (re-verification),
 * so the two always agree.
 *
 * - strips diacritics (ñ -> n, á -> a) and lowercases
 * - replaces punctuation, including hyphens and apostrophes, with spaces
 *   ("mag-aral" -> "mag aral")
 * - collapses repeated whitespace and trims
 */
export function normalizeUtterance(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}