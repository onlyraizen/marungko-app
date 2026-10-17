import { KEYWORDS, UNITS } from "@marungko/shared";
import { CARDS } from "../art/cards";

/** A word that has a picture. The picture itself is drawn by WordPicture. */
export type Picture = { word: string };

/** Fallback emoji for the few words with no card and no drawn picture. */
const EMOJI: Readonly<Record<string, string>> = {};

export const NUMBERS: Readonly<Record<string, number>> = {
  isa: 1, dalawa: 2, tatlo: 3, apat: 4, lima: 5, anim: 6, pito: 7, walo: 8, siyam: 9, sampu: 10,
};

export const COLOR_WORDS: Readonly<Record<string, string>> = {
  pula: "#E8473A", asul: "#2F7FD6", dilaw: "#F7C531", berde: "#4DB35A", puti: "#FFFFFF", itim: "#2B2B2B", kahel: "#F7902F",
};

/** The file key of a word's picture card: "magandang umaga" -> "magandang-umaga". */
export const cardKey = (word: string): string => word.toLowerCase().trim().replace(/\s+/g, "-");

export const hasCard = (word: string): boolean => CARDS[cardKey(word)] !== undefined;

/** True when we can show something for the word: a card, a numeral, a colour swatch or an emoji. */
export function hasPicture(word: string): boolean {
  const key = word.toLowerCase();
  return hasCard(key) || NUMBERS[key] !== undefined || COLOR_WORDS[key] !== undefined || EMOJI[key] !== undefined;
}

export const emojiFor = (word: string): string | undefined => EMOJI[word.toLowerCase()];

/** The picture for a word, if we have one. */
export function pictureOf(word: string): Picture | null {
  return hasPicture(word) ? { word: word.toLowerCase() } : null;
}

const ALL_WORDS: readonly string[] = [...new Set(UNITS.flatMap((unit) => unit.words))];

/**
 * The example word for a syllable ("sa" gives saging). `exclude` is skipped, so the example for "ba"
 * in "bata" is not "bata" itself.
 */
export function exampleFor(syllable: string, exclude?: string): Picture | null {
  const key = syllable.toLowerCase();
  const skip = exclude?.toLowerCase();
  const found = KEYWORDS[key];
  if (found && found.word !== skip && hasPicture(found.word)) return { word: found.word };
  const other = ALL_WORDS.filter((word) => word !== skip && !word.includes(" ") && word.startsWith(key) && hasPicture(word)).sort(
    (a, b) => a.length - b.length,
  )[0];
  return other ? { word: other } : null;
}
