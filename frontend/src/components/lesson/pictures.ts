import { KEYWORDS } from "@marungko/shared";

/** A picture for each lesson word. Emoji, so nothing extra to download. Draft until a teacher reviews it. */
export const WORD_EMOJI: Readonly<Record<string, string>> = {
  ama: "👨‍👧", asa: "🤞", isa: "1️⃣", mama: "👨", masa: "🫓", misa: "⛪", sama: "🤝", mais: "🌽", aso: "🐶",
  baso: "🥤", mesa: "🍽️", ubas: "🍇", ube: "🍠", sabi: "💬",
  mata: "👁️", bata: "🧒", kama: "🛏️", lima: "5️⃣", mali: "❌", bola: "⚽", tasa: "🍵", yaya: "🍼", yelo: "🧊",
  ina: "👩", ibon: "🐦", pusa: "🐱", pato: "🦆", puso: "❤️", dila: "👅", araw: "☀️", ilaw: "💡", bahay: "🏠", gatas: "🥛",
  dalawa: "2️⃣", tatlo: "3️⃣", apat: "4️⃣", anim: "6️⃣", pito: "7️⃣", walo: "8️⃣", siyam: "9️⃣", sampu: "🔟",
  isda: "🐟", baka: "🐄", kabayo: "🐴", manok: "🐔",
  nanay: "👩", tatay: "👨", ate: "👧", kuya: "👦", lola: "👵", lolo: "👴",
  ilong: "👃", bibig: "👄", tenga: "👂", kamay: "✋", paa: "🦶",
  saging: "🍌", mansanas: "🍎", mangga: "🥭", tubig: "💧", kanin: "🍚", tinapay: "🍞",
  pula: "🔴", asul: "🔵", dilaw: "🟡", berde: "🟢", puti: "⚪", itim: "⚫", kahel: "🟠",
  buwan: "🌙", bituin: "⭐", puno: "🌳", dahon: "🍃", bulaklak: "🌸",
  salamat: "🙏", po: "🙇", opo: "👍", "magandang umaga": "🌅",
  libro: "📖", lapis: "✏️", papel: "📄",
};

export type Picture = { word: string; emoji: string };

/** The picture for a word, if we have one. */
export function pictureOf(word: string): Picture | null {
  const key = word.toLowerCase();
  const emoji = WORD_EMOJI[key];
  return emoji ? { word: key, emoji } : null;
}

/** The example word and picture for a syllable ("sa" gives saging). */
export function exampleFor(syllable: string): Picture | null {
  const found = KEYWORDS[syllable.toLowerCase()];
  return found ? { word: found.word, emoji: found.emoji } : null;
}

export type QuizQuestion = { answer: Picture; options: Picture[] };

const shuffle = <T,>(list: readonly T[]): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

/**
 * "Select the correct picture" questions from the lesson's own words. Each has the right picture
 * and two others, never two with the same emoji. Words without a picture are skipped.
 */
export function buildQuiz(words: readonly string[], count = 4): QuizQuestion[] {
  const own = words.map(pictureOf).filter((p): p is Picture => p !== null);
  const unique = own.filter((p, i) => own.findIndex((q) => q.emoji === p.emoji) === i);
  const world = Object.entries(WORD_EMOJI).map(([word, emoji]) => ({ word, emoji }));
  return shuffle(unique)
    .slice(0, count)
    .map((answer) => {
      const near = shuffle(unique.filter((p) => p.emoji !== answer.emoji));
      const far = shuffle(world.filter((p) => p.emoji !== answer.emoji && !near.some((n) => n.emoji === p.emoji)));
      const distractors = [...near, ...far].slice(0, 2);
      return { answer, options: shuffle([answer, ...distractors]) };
    });
}
