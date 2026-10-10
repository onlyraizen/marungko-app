import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { UnitSchema } from "../packages/shared/dist/index.js";

// Estimate only. Nothing is sent to ElevenLabs.
// Rate: ElevenLabs Multilingual v2 pay-as-you-go, per 1,000 characters (pricing page, Oct 2026).
// Re-check https://elevenlabs.io/pricing/api before relying on it.
const RATE_PER_1K_USD = 0.08;
const CREDITS_PER_CHARACTER = 1; // assumption for Multilingual v2; Flash is about half
const FREE_CREDITS = 10_000;
const STARTER_CREDITS = 30_000;

const contentDir = join(import.meta.dirname, "..", "content");
const unitsDir = join(contentDir, "units");

const words = new Set<string>();
const syllables = new Set<string>();
for (const file of readdirSync(unitsDir).filter((name) => name.endsWith(".json")).sort()) {
  const unit = UnitSchema.parse(JSON.parse(readFileSync(join(unitsDir, file), "utf8")));
  for (const word of unit.words) words.add(word.toLowerCase());
  for (const syllable of unit.syllables) syllables.add(syllable.toLowerCase());
}

const phrasesFile = JSON.parse(readFileSync(join(contentDir, "phrases.json"), "utf8")) as {
  phrases: string[];
};
const phrases = new Set(phrasesFile.phrases);

const total = (set: Set<string>): number => [...set].reduce((sum, text) => sum + text.length, 0);
const usd = (characters: number): string => `$${((characters / 1000) * RATE_PER_1K_USD).toFixed(2)}`;
const credits = (characters: number): number => characters * CREDITS_PER_CHARACTER;

const wordChars = total(words);
const phraseChars = total(phrases);
const syllableChars = total(syllables);
const firstPass = wordChars + phraseChars;

console.log("Unique items to generate (letter sounds are recorded by a person, not generated):");
console.log(`  words      ${String(words.size).padStart(4)}  ${String(wordChars).padStart(6)} characters`);
console.log(`  phrases    ${String(phrases.size).padStart(4)}  ${String(phraseChars).padStart(6)} characters`);
console.log(`  syllables  ${String(syllables.size).padStart(4)}  ${String(syllableChars).padStart(6)} characters  (optional: recording them by hand is better)`);
console.log("");
console.log(`First pass, words + phrases:     ${firstPass} characters  ~ ${credits(firstPass)} credits  ~ ${usd(firstPass)}`);
console.log(`With syllables as well:          ${firstPass + syllableChars} characters  ~ ${usd(firstPass + syllableChars)}`);
console.log(`With 3 re-takes of everything:   ${(firstPass + syllableChars) * 3} characters  ~ ${usd((firstPass + syllableChars) * 3)}`);
console.log("");
console.log(`Free plan credits per month: ${FREE_CREDITS}.  Starter: ${STARTER_CREDITS}.`);
console.log(
  credits((firstPass + syllableChars) * 3) <= STARTER_CREDITS
    ? "Even with 3 re-takes this fits inside one Starter month."
    : "With 3 re-takes this exceeds one Starter month; generate in batches or re-take only the words that need it.",
);
