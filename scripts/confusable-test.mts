import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { UnitSchema, normalizeUtterance } from "../packages/shared/dist/index.js";
import { acceptedFor } from "../frontend/src/content/accepted.ts";
import { syllabify } from "../frontend/src/content/syllables.ts";
import { decideAttempt } from "../frontend/src/speech/attempt.ts";

/**
 * Layer 4: near-miss words that must NOT pass. For every word and syllable of Books 1 to 4 it builds look-alikes
 * (a dropped or added syllable or letter, another vowel, a neighbouring consonant, every other lesson item) and
 * checks that none is accepted as correct. "Halos tama" (one letter off, targets of 4+ letters) is allowed: it is
 * a retry, not a pass.
 *
 *   pnpm speech:confusable-test                list the failures (there must be none)
 *   pnpm speech:confusable-test -- --show pato show the look-alikes of one target and how each is judged
 */

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const show = args.includes("--show") ? args[args.indexOf("--show") + 1] : undefined;

const targets = new Set<string>();
for (const file of readdirSync(join(root, "content", "units")).filter((name) => name.endsWith(".json"))) {
  const unit = UnitSchema.parse(JSON.parse(readFileSync(join(root, "content", "units", file), "utf8")));
  for (const text of [...unit.syllables, ...unit.words]) targets.add(text.toLowerCase());
}
const all = [...targets];

const VOWELS = ["a", "e", "i", "o", "u"];
const SWAPS: Record<string, string[]> = { p: ["b", "t"], b: ["p", "d"], t: ["d", "k"], d: ["t", "b"], k: ["g", "t"], g: ["k", "d"], m: ["n", "b"], n: ["m", "ng"], l: ["r", "n"], r: ["l", "d"], s: ["h", "t"], h: ["s", "k"], y: ["w", "l"], w: ["y", "b"] };

function lookAlikes(target: string): string[] {
  const out = new Set<string>();
  const letters = target.split("");
  const parts = syllabify(target);
  if (parts.length >= 2) {
    out.add(parts.slice(1).join(""));
    out.add(parts.slice(0, -1).join(""));
    out.add(parts.slice(1).concat(parts.slice(0, 1)).join("")); // syllables swapped round
  }
  for (const extra of ["a", "ng", "n", "s", "o", "po", "ka", "ma"]) {
    out.add(`${extra}${target}`);
    out.add(`${target}${extra}`);
  }
  out.add(target.slice(1));
  out.add(target.slice(0, -1));
  out.add(target + target.slice(-1));
  letters.forEach((ch, i) => {
    for (const vowel of VOWELS) if (VOWELS.includes(ch) && vowel !== ch) out.add(letters.slice(0, i).join("") + vowel + letters.slice(i + 1).join(""));
    for (const swap of SWAPS[ch] ?? []) out.add(letters.slice(0, i).join("") + swap + letters.slice(i + 1).join(""));
  });
  for (const other of all) out.add(other);
  out.delete(target);
  return [...out].filter((word) => word !== "" && normalizeUtterance(word).replace(/\s+/g, "") !== normalizeUtterance(target).replace(/\s+/g, ""));
}

const verdict = (heard: string, target: string) =>
  decideAttempt({ heard, target, accepted: acceptedFor(target), syllables: syllabify(target).length, spanMs: null, confidence: 0.9 }).result.kind;

if (show !== undefined) {
  console.log(`${show}: how each look-alike is judged (correct = WRONG, a leak)`);
  for (const word of lookAlikes(show.toLowerCase())) console.log(`  ${word.padEnd(12)} ${verdict(word, show.toLowerCase())}`);
  process.exit(0);
}

// Named cases from the pilot report (2026-11-14): a vowel said the everyday way must not pass in a lesson.
// "almost" is allowed (a gentle retry with the model word replayed); "correct" is not. The right word must pass.
const MUST_FAIL: Array<[string, string]> = [
  ["mali", "ma-le"], ["mali", "male"], ["mali", "mele"], ["mali", "mile"],
  ["bola", "bu-la"], ["bola", "bula"], ["bola", "bule"],
  ["yelo", "yi-lu"], ["yelo", "yilo"], ["yelo", "yelu"], ["yelo", "yilu"],
  ["mais", "maes"], ["mais", "mes"], ["mais", "ma-es"], ["mais", "mays"],
  ["kanin", "kanina"], ["kanin", "kani"],
];
const MUST_PASS: Array<[string, string]> = [["mali", "mali"], ["bola", "bola"], ["yelo", "yelo"], ["mais", "ma-is"], ["mais", "mais"], ["kanin", "ka-nin"]];
const named: string[] = [];
for (const [target, said] of MUST_FAIL) if (verdict(said, target) === "correct") named.push(`"${said}" passes as "${target}"`);
for (const [target, said] of MUST_PASS) if (verdict(said, target) !== "correct") named.push(`"${said}" is rejected for "${target}"`);
if (named.length > 0) {
  console.log(`NAMED CASES FAILED (${named.length}):\n  ${named.join("\n  ")}`);
  process.exit(1);
}
console.log(`Named cases: ${MUST_FAIL.length} wrong spellings rejected, ${MUST_PASS.length} right ones accepted.`);

let checked = 0;
const leaks: string[] = [];
for (const target of all) {
  const accepted = new Set(acceptedFor(target));
  for (const word of lookAlikes(target)) {
    if (accepted.has(word)) continue;
    checked += 1;
    if (verdict(word, target) === "correct") leaks.push(`"${word}" passes as "${target}"`);
  }
}
console.log(`${all.length} targets, ${checked} look-alikes checked.`);
console.log(leaks.length === 0 ? "No look-alike is accepted as correct." : `LEAKS (${leaks.length}):\n  ${leaks.join("\n  ")}`);
process.exit(leaks.length === 0 ? 0 : 1);
