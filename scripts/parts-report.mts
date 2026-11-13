import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { UnitSchema, unitItems } from "../packages/shared/dist/index.js";
import { partsFor } from "../frontend/src/content/parts.ts";
import { syllabify } from "../frontend/src/content/syllables.ts";

/**
 * How each lesson is split into parts by number of syllables (frontend/src/content/parts.ts), and which words contain a
 * syllable that no lesson teaches on its own (the "tor" of "motor": the child has never met "tor").
 *
 *   pnpm content:parts
 */
const root = join(import.meta.dirname, "..");
const units = readdirSync(join(root, "content", "units"))
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => UnitSchema.parse(JSON.parse(readFileSync(join(root, "content", "units", name), "utf8"))));

// Taught on their own: every syllable listed in a lesson, and the five vowels (taught as letters).
const taught = new Set<string>(["a", "e", "i", "o", "u", ...units.flatMap((unit) => unit.syllables)]);

const untaughtWords = new Map<string, string[]>();
for (const unit of units) {
  const items = unitItems(unit)
    .filter((item) => item.kind !== "sound")
    .map((item) => item.text);
  const parts = partsFor(items);
  console.log(`\n${unit.id}  ${unit.title}`);
  for (const part of parts) {
    const label = part.count === 4 ? "4+ syllables" : `${part.count} syllable${part.count === 1 ? " " : "s"}`;
    console.log(`  ${label.padEnd(13)} (${String(part.items.length).padStart(2)}):  ${part.items.join(" ")}`);
  }
  for (const word of unit.words) {
    if (word.includes(" ")) continue;
    const missing = syllabify(word).filter((syllable) => !taught.has(syllable));
    if (missing.length > 0) untaughtWords.set(`${unit.id}:${word}`, missing);
  }
}

const allWords = units.flatMap((unit) => unit.words).filter((word) => !word.includes(" "));
console.log(`\nWords with a syllable that is never taught on its own (${untaughtWords.size} of ${allWords.length} words):`);
for (const [key, missing] of untaughtWords) console.log(`  ${key.padEnd(24)} ${syllabify(key.split(":")[1] ?? "").join("·").padEnd(14)} not taught: ${missing.join(", ")}`);
const distinct = new Set([...untaughtWords.values()].flat());
// Open = ends in a vowel (pu, di, nga): a child who knows the letters can blend it. Closed = ends in a consonant (tor, sul).
const open = [...distinct].filter((syllable) => /[aeiou]$/.test(syllable)).sort();
const closed = [...distinct].filter((syllable) => !/[aeiou]$/.test(syllable)).sort();
console.log(`\n${distinct.size} such syllables:`);
console.log(`  open, like "pu" (${open.length}):   ${open.join(" ")}`);
console.log(`  closed, like "tor" (${closed.length}): ${closed.join(" ")}`);

// What a quiz could use if it only asked for words made entirely of taught syllables.
let eligible = 0;
for (const word of allWords) if (!syllabify(word).some((syllable) => !taught.has(syllable))) eligible += 1;
console.log(`\nWords made only of taught syllables: ${eligible} of ${allWords.length}. A rule "quiz only these" would leave several lessons with no quiz at all.`);
