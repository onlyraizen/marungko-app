/**
 * Splits a Tagalog word into syllables for the "ba·ta" display and the tap-the-syllables quiz.
 * Rules (enough for the words in the lessons): "ng" counts as one consonant, a single consonant
 * goes with the vowel after it, two consonants split between them, and a consonant at the end
 * stays with the last syllable. Words with a space are split word by word.
 */
const VOWELS = "aeiou";

const isVowel = (ch: string): boolean => VOWELS.includes(ch);

/** Letters of the word, with "ng" kept together as one consonant. */
function tokens(word: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i += 1) {
    const ch = word.charAt(i);
    if (ch === "n" && word.charAt(i + 1) === "g") {
      out.push("ng");
      i += 1;
    } else {
      out.push(ch);
    }
  }
  return out;
}

function splitOne(word: string): string[] {
  const t = tokens(word.toLowerCase());
  const nuclei: number[] = [];
  t.forEach((ch, i) => {
    if (isVowel(ch)) nuclei.push(i);
  });
  if (nuclei.length <= 1) return [t.join("")];

  // Where each syllable starts (index into t).
  const starts: number[] = [0];
  for (let n = 0; n < nuclei.length - 1; n += 1) {
    const a = nuclei[n] as number;
    const b = nuclei[n + 1] as number;
    const gap = b - a - 1; // consonants between the two vowels
    if (gap <= 0) starts.push(b); // two vowels in a row: split between them
    else if (gap === 1) starts.push(b - 1); // one consonant goes with the next vowel
    else starts.push(b - gap + 1); // more: the first stays behind, the rest go forward
  }
  const parts = starts.map((s, i) => t.slice(s, starts[i + 1] ?? t.length).join(""));
  return parts;
}

export function syllabify(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => splitOne(word));
}

/** "ba·ta" style: syllables joined by a middle dot. */
export const dotted = (text: string): string => syllabify(text).join("·");
