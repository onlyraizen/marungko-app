import { UNITS } from "@marungko/shared";
import { MEANINGS } from "./meanings";
import { syllabify } from "./syllables";

export type TapTile = { id: string; label: string };
export type TapQuestion = { word: string; syllables: string[]; tiles: TapTile[] };

const shuffle = <T,>(list: readonly T[]): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

const ALL_SYLLABLES: readonly string[] = [
  ...new Set([...UNITS.flatMap((unit) => unit.syllables), ...UNITS.flatMap((unit) => unit.words).flatMap(syllabify)]),
].filter((syllable) => syllable.length >= 2 && syllable.length <= 3);

/**
 * "Pindutin ang naririnig mo" questions: Capi says a word and the child taps its syllables in order.
 * Only single words of two to four syllables are used. The tiles are the word's own syllables plus
 * look-alike syllables from the same lesson (then from any lesson) so there is something to choose.
 */
export function buildTapQuiz(words: readonly string[], count = 4): TapQuestion[] {
  const eligible = words.filter((word) => {
    if (word.includes(" ")) return false;
    const n = syllabify(word).length;
    return n >= 2 && n <= 4;
  });
  const lessonSyllables = [...new Set(words.flatMap((word) => syllabify(word)))];

  return shuffle(eligible)
    .slice(0, count)
    .map((word) => {
      const syllables = syllabify(word);
      const own = new Set(syllables);
      const total = Math.max(6, syllables.length + 3);
      const near = shuffle(lessonSyllables.filter((s) => !own.has(s) && s.length >= 2));
      const far = shuffle(ALL_SYLLABLES.filter((s) => !own.has(s) && !near.includes(s)));
      const extra = [...near, ...far].slice(0, total - syllables.length);
      const labels = shuffle([...syllables, ...extra]);
      return { word, syllables, tiles: labels.map((label, i) => ({ id: `${word}-${i}`, label })) };
    });
}

export type Explanation = {
  word: string;
  parts: string[];
  /** One line per different syllable. */
  lines: { syllable: string; example: string | null }[];
  meaning: string | null;
};

/** Everything the "Ipaliwanag ang sagot ko" page says about a word. */
export function explain(word: string, exampleFor: (syllable: string, exclude: string) => string | null): Explanation {
  const parts = syllabify(word);
  const seen = new Set<string>();
  const lines = parts
    .filter((syllable) => (seen.has(syllable) ? false : (seen.add(syllable), true)))
    .map((syllable) => ({ syllable, example: exampleFor(syllable, word) }));
  return { word, parts, lines, meaning: MEANINGS[word.toLowerCase()] ?? null };
}
