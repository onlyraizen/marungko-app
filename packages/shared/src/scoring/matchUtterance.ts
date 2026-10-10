import { normalizeUtterance } from "./normalize.js";

export type MatchKind = "correct" | "almost" | "incorrect";

export interface MatchResult {
  kind: MatchKind;
  /** What was heard, normalized (lowercase, no punctuation). */
  heard: string;
  /** The target, normalized. */
  expected: string;
}

const squash = (value: string): string => normalizeUtterance(value).replace(/\s+/g, "");

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      previous[j] = Math.min(above + 1, (previous[j - 1] ?? 0) + 1, diagonal + cost);
      diagonal = above;
    }
  }
  return previous[b.length] ?? 0;
}

/**
 * Scores what a child said against the target sound or word.
 *
 * - correct:   matches the target (or an accepted variant) once capitals,
 *              punctuation and spaces are ignored; repeating the sound
 *              ("ma ma" for "ma") also counts.
 * - almost:    only for targets of 4+ letters, and only one letter away.
 *              Short sounds never get "almost": one letter IS the difference
 *              between "ma" and "na".
 * - incorrect: anything else, including silence.
 */
export function matchUtterance(
  heardRaw: string,
  expectedRaw: string,
  acceptList: readonly string[] = [],
): MatchResult {
  const heard = normalizeUtterance(heardRaw);
  const expected = normalizeUtterance(expectedRaw);
  const result = (kind: MatchKind): MatchResult => ({ kind, heard, expected });

  if (heard === "") return result("incorrect");

  const candidates = [expectedRaw, ...acceptList].map(squash);
  const heardSquashed = heard.replace(/\s+/g, "");
  if (candidates.includes(heardSquashed)) return result("correct");

  const words = heard.split(" ");
  if (words.length > 1 && words.every((word) => candidates.includes(word))) {
    return result("correct");
  }

  const target = squash(expectedRaw);
  if (target.length >= 4 && editDistance(heardSquashed, target) <= 1) {
    return result("almost");
  }
  return result("incorrect");
}
