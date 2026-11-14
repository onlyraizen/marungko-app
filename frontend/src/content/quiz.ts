import { UNITS } from "@marungko/shared";
import { MEANINGS } from "./meanings";
import { syllabify } from "./syllables";

export type TapTile = { id: string; label: string };
/** Build the word from syllable tiles. `picture` says the word has a picture card to show beside the speaker. */
export type BuildQuestion = { kind: "build"; word: string; syllables: string[]; tiles: TapTile[]; picture: boolean };
/** See the picture, hear the word if you like, and tap the right word out of three. */
export type ChoiceQuestion = { kind: "choice"; word: string; syllables: string[]; choices: string[]; picture: true };
/** Hear the word (no picture shown, no written word) and tap its picture out of four. */
export type ListenQuestion = { kind: "listen"; word: string; syllables: string[]; pictures: string[]; picture: false };
export type QuizQuestion = BuildQuestion | ChoiceQuestion | ListenQuestion;
export type TapQuestion = BuildQuestion;

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

/** How many questions go in each part's quiz. */
export const QUIZ_QUESTIONS = 3;

const quizEligible = (word: string): boolean => {
  if (word.includes(" ")) return false;
  const n = syllabify(word).length;
  return n >= 1 && n <= 4;
};

/** How many questions a part's quiz will have (so the progress bar can be worked out before it is built). */
export function quizSize(items: readonly string[], count = QUIZ_QUESTIONS): number {
  return Math.min(count, items.filter(quizEligible).length);
}

const ALL_WORDS: readonly string[] = [
  ...new Set(UNITS.flatMap((unit) => unit.words).map((word) => word.toLowerCase()).filter((word) => !word.includes(" "))),
];

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0] as number;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const keep = row[j] as number;
      row[j] = Math.min(keep + 1, (row[j - 1] as number) + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length] as number;
}

/**
 * Two wrong words for a picture-to-word question: the same number of syllables as the answer (so the length gives
 * nothing away), taken from the part's own words first, and never a near-identical spelling ("bata" / "baka") that
 * an early reader could mix up: at least 3 edits away and a different first letter, relaxing only if too few exist.
 */
export function distractorsFor(word: string, partWords: readonly string[]): string[] {
  const count = syllabify(word).length;
  const lower = word.toLowerCase();
  const usable = (pool: readonly string[]) => [...new Set(pool.map((w) => w.toLowerCase()))].filter((c) => c !== lower && !c.includes(" ") && syllabify(c).length === count);
  const rules = [
    (c: string) => distance(lower, c) >= 3 && c[0] !== lower[0],
    (c: string) => distance(lower, c) >= 2 && c[0] !== lower[0],
  ];
  for (const rule of rules) {
    const own = shuffle(usable(partWords).filter(rule));
    const more = shuffle(usable(ALL_WORDS).filter((c) => rule(c) && !own.includes(c)));
    const picked = [...own, ...more].slice(0, 2);
    if (picked.length === 2) return picked;
  }
  return [];
}

/**
 * Three wrong pictures for a hear-the-word question. Every one must have a picture card, start with a different letter
 * than the answer and not be a near-identical spelling, so the ear (not the eye) has to decide. They come from the
 * part's own words first, then from any lesson. Returns [] when three good ones do not exist.
 */
export function pictureDistractorsFor(word: string, partWords: readonly string[], hasPicture: (word: string) => boolean): string[] {
  const lower = word.toLowerCase();
  const usable = (pool: readonly string[]) => [...new Set(pool.map((w) => w.toLowerCase()))].filter((c) => c !== lower && !c.includes(" ") && hasPicture(c));
  const rules = [
    (c: string) => distance(lower, c) >= 3 && c[0] !== lower[0],
    (c: string) => distance(lower, c) >= 2 && c[0] !== lower[0],
  ];
  for (const rule of rules) {
    const picked: string[] = [];
    for (const c of [...shuffle(usable(partWords).filter(rule)), ...shuffle(usable(ALL_WORDS).filter(rule))]) {
      // Also different from each other at the first letter, so two wrong pictures never sound alike.
      if (!picked.includes(c) && picked.every((p) => p[0] !== c[0])) picked.push(c);
      if (picked.length === 3) return picked;
    }
  }
  return [];
}

/**
 * The questions of a part's quiz. Three formats rotate (build, choice, listen, build, ...):
 *  - build: Capi says the item and the child taps its syllables in order. A part only holds items with the same number
 *    of syllables (see parts.ts), so a question has exactly as many tiles to place as that part teaches. The tiles are
 *    the item's own syllables plus look-alike syllables from the same lesson (then from any lesson). The picture card
 *    is shown when the word has one.
 *  - choice: the picture of the word and three written words to choose from. Only words with a picture and two good
 *    wrong answers get this format; the rest are build questions.
 *  - listen: Capi says the word and the child taps its picture out of four (no written word anywhere). Same rule.
 * `hasPicture` says which words have a picture card (the app passes the card list; tests pass the files on disk).
 */
export function buildTapQuiz(words: readonly string[], count = QUIZ_QUESTIONS, hasPicture: (word: string) => boolean = () => false): QuizQuestion[] {
  const eligible = shuffle(words.filter(quizEligible));
  const n = Math.min(count, eligible.length);
  const lessonSyllables = [...new Set(words.flatMap((word) => syllabify(word)))];

  // The formats rotate build, choice, listen, build, ... A picture format needs a pictured word with good wrong answers;
  // when none is left the slot is a build question.
  const FORMATS = ["build", "choice", "listen"] as const;
  const slots: (string | null)[] = Array.from({ length: n }, () => null);
  const formatAt: ("build" | "choice" | "listen")[] = Array.from({ length: n }, () => "build");
  const used = new Set<string>();
  for (let i = 1; i < n; i += 1) {
    const format = FORMATS[i % FORMATS.length] as "build" | "choice" | "listen";
    if (format === "build") continue;
    const word = eligible.find(
      (w) => !used.has(w) && hasPicture(w) && (format === "choice" ? distractorsFor(w, words).length === 2 : pictureDistractorsFor(w, words, hasPicture).length === 3),
    );
    if (word === undefined) continue;
    slots[i] = word;
    formatAt[i] = format;
    used.add(word);
  }
  const rest = eligible.filter((word) => !used.has(word)).sort((a, b) => Number(hasPicture(b)) - Number(hasPicture(a)));
  for (let i = 0; i < n; i += 1) if (slots[i] === null) slots[i] = rest.shift() ?? null;

  return slots.flatMap((word, i): QuizQuestion[] => {
    if (word === null) return [];
    const syllables = syllabify(word);
    if (formatAt[i] === "listen") return [{ kind: "listen", word, syllables, pictures: shuffle([word, ...pictureDistractorsFor(word, words, hasPicture)]), picture: false }];
    if (formatAt[i] === "choice") return [{ kind: "choice", word, syllables, choices: shuffle([word, ...distractorsFor(word, words)]), picture: true }];
    const own = new Set(syllables);
    const total = syllables.length === 1 ? 4 : Math.max(6, syllables.length + 3);
    const near = shuffle(lessonSyllables.filter((s) => !own.has(s) && s.length >= 2));
    const far = shuffle(ALL_SYLLABLES.filter((s) => !own.has(s) && !near.includes(s)));
    const extra = [...near, ...far].slice(0, total - syllables.length);
    const labels = shuffle([...syllables, ...extra]);
    return [{ kind: "build", word, syllables, tiles: labels.map((label, k) => ({ id: `${word}-${k}`, label })), picture: hasPicture(word) }];
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
