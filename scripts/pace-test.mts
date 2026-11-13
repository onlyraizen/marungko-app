import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UnitSchema, audioKey } from "../packages/shared/dist/index.js";
import { syllabify } from "../frontend/src/content/syllables.ts";
import { PACE_PRESETS, expectedMs, findSpan, judgePace, type PaceSettings } from "../frontend/src/speech/pace.ts";
import { writeFileSync } from "node:fs";
import { envelope, readWav } from "./lib/audio.mts";

/**
 * Tests the pace guard on the guide voice's own word clips, sped up with ffmpeg. This is a SIMULATION: it shows
 * how the guard treats a clear word said 1.25x, 1.5x, 2x and more too fast. It is not child speech and it is not
 * a person trying to cheat; real recordings (adult and children, with consent, measured and thrown away) are
 * still needed to set the numbers (docs/SPEECH-CHECK.md section 2).
 *
 *   pnpm speech:pace-test                 table by number of syllables, then detection by speed
 *   pnpm speech:pace-test -- --list pato  one word at every speed
 *   pnpm speech:pace-test -- --write-table  rewrite frontend/src/speech/wordPace.ts from the clips (run after any
 *                                           word is regenerated: the app compares a child with these lengths)
 *
 * Needs ffmpeg.
 */

const root = join(import.meta.dirname, "..");
const dir = join(root, "frontend", "assets", "audio", "words");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const listWord = args.includes("--list") ? args[args.indexOf("--list") + 1] : undefined;

const words = new Set<string>();
for (const file of readdirSync(join(root, "content", "units")).filter((name) => name.endsWith(".json"))) {
  const unit = UnitSchema.parse(JSON.parse(readFileSync(join(root, "content", "units", file), "utf8")));
  for (const word of unit.words) if (!word.includes(" ")) words.add(word);
  for (const syllable of unit.syllables) words.add(syllable); // one-syllable items: the app compares "mo" with the guide's own "mo"
}
const clips = [...words].filter((word) => existsSync(join(dir, `${audioKey(word)}.wav`)));
if (spawnSync("ffmpeg", ["-version"]).status !== 0) throw new Error("ffmpeg not found");

const scratch = mkdtempSync(join(tmpdir(), "pace-"));
function tempoStages(speed: number): string[] {
  // atempo takes 0.5 to 2 per stage; chain stages for more.
  const stages: string[] = [];
  let left = speed;
  while (left > 2) {
    stages.push("atempo=2");
    left /= 2;
  }
  while (left < 0.5) {
    stages.push("atempo=0.5");
    left /= 0.5;
  }
  stages.push(`atempo=${left}`);
  return stages;
}

/** Like a real attempt: 400 ms of quiet before and after the clip. Returns the measured span and the quiet lead. */
function measurePadded(word: string, speed: number): { spanMs: number; leadMs: number } | null {
  const source = join(dir, `${audioKey(word)}.wav`);
  const path = join(scratch, `${audioKey(word)}.${speed}.padded.wav`);
  const filters = [...tempoStages(speed), "adelay=400:all=1", "apad=pad_dur=0.4"].join(",");
  const run = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-af", filters, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", path]);
  if (run.status !== 0) throw new Error(`ffmpeg failed for ${word}`);
  const wav = readWav(path);
  if (wav === null) return null;
  const span = findSpan(envelope(wav.samples, wav.rate));
  return span === null ? null : { spanMs: span.spanMs, leadMs: span.startMs };
}

function spanAt(word: string, speed: number): number | null {
  const source = join(dir, `${audioKey(word)}.wav`);
  let path = source;
  if (speed !== 1) {
    path = join(scratch, `${audioKey(word)}.${speed}.wav`);
    const stages = tempoStages(speed);
    const run = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-af", stages.join(","), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", path]);
    if (run.status !== 0) throw new Error(`ffmpeg failed for ${word}`);
  } else {
    path = join(scratch, `${audioKey(word)}.1.wav`);
    spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", path]);
  }
  const wav = readWav(path);
  if (wav === null) return null;
  return findSpan(envelope(wav.samples, wav.rate))?.spanMs ?? null;
}

const median = (list: number[]): number => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)] ?? 0;
const pct = (list: number[], p: number): number => [...list].sort((a, b) => a - b)[Math.min(list.length - 1, Math.floor(list.length * p))] ?? 0;

if (listWord !== undefined) {
  const n = syllabify(listWord).length;
  console.log(`${listWord}: ${n} syllables, calm time ${expectedMs(n)} ms`);
  for (const speed of [0.8, 1, 1.25, 1.5, 2, 2.5, 3]) {
    const span = spanAt(listWord, speed);
    if (span === null) continue;
    const row = (name: string, settings: PaceSettings) => `${name}: ${judgePace(n, span, settings).why}`;
    console.log(`  x${speed}  ${String(span).padStart(4)} ms  ratio ${(span / expectedMs(n)).toFixed(2)}   ${row("lenient", PACE_PRESETS.lenient)}  ${row("balanced", PACE_PRESETS.balanced)}  ${row("strict", PACE_PRESETS.strict)}`);
  }
  rmSync(scratch, { recursive: true, force: true });
  process.exit(0);
}

const model = new Map<string, number>();
const bySyllables = new Map<number, number[]>();
for (const word of clips) {
  const span = spanAt(word, 1);
  if (span === null) continue;
  model.set(audioKey(word), span);
  const n = syllabify(word).length;
  bySyllables.set(n, [...(bySyllables.get(n) ?? []), span]);
}
console.log(`${clips.length} word clips (the guide voice, first sound to last sound)\n`);
console.log("syllables  words  median ms  p10   p90   table value (EXPECTED_MS)");
for (const [n, spans] of [...bySyllables.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`${String(n).padStart(5)}      ${String(spans.length).padStart(4)}   ${String(median(spans)).padStart(7)}  ${String(pct(spans, 0.1)).padStart(4)}  ${String(pct(spans, 0.9)).padStart(4)}   ${expectedMs(n)}`);
}

if (args.includes("--write-table")) {
  const rows = [...model.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, ms]) => `  ${JSON.stringify(key)}: ${ms},`);
  writeFileSync(
    join(root, "frontend", "src", "speech", "wordPace.ts"),
    `// GENERATED by scripts/pace-test.mts --write-table. Do not edit by hand.\n` +
      `// How long the guide voice's clip of each word is, first sound to last sound, in ms.\n` +
      `export const WORD_MS: Readonly<Record<string, number>> = {\n${rows.join("\n")}\n};\n`,
  );
  console.log(`\nWrote frontend/src/speech/wordPace.ts (${model.size} words).`);
}

const speeds = [0.8, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
console.log("\nShare of words the guard calls rushed (an 'Almost' with a slow-down hint) when the clip is sped up");
console.log("speed   lenient  balanced  strict    (x1 and x0.8 should be 0%: those would be false rejects)");
const detail: Record<string, number> = {};
for (const speed of speeds) {
  const counts = { lenient: 0, balanced: 0, strict: 0 };
  let total = 0;
  for (const word of clips) {
    const n = syllabify(word).length;
    if (n < 2) continue;
    const span = spanAt(word, speed);
    if (span === null) continue;
    total += 1;
    for (const name of ["lenient", "balanced", "strict"] as const) if (judgePace(n, span, PACE_PRESETS[name], model.get(audioKey(word))).rushed) counts[name] += 1;
  }
  const show = (count: number): string => `${Math.round((100 * count) / total)}%`.padStart(6);
  console.log(`x${String(speed).padEnd(5)} ${show(counts.lenient)}   ${show(counts.balanced)}   ${show(counts.strict)}     (${total} words of 2+ syllables)`);
  detail[`x${speed}`] = Math.round((100 * counts.balanced) / total);
}

// One-syllable items stretched out ("mo" said "moooo"). A slowed copy of the guide's clip is only a stand-in for a
// child holding the vowel, so this shows how the numbers behave, not how children sound.
const oneSyllable = clips.filter((word) => syllabify(word).length === 1);
if (oneSyllable.length > 0) {
  console.log(`\nShare of the ${oneSyllable.length} one-syllable clips called "too long" when played slower (a stand-in for "moooo")`);
  console.log("speed   lenient  balanced  strict    (x1 and x0.7 should be 0%: those would be false rejects)");
  for (const speed of [1, 0.7, 0.5, 0.4, 0.33, 0.25]) {
    const counts = { lenient: 0, balanced: 0, strict: 0 };
    const spans: number[] = [];
    let total = 0;
    for (const word of oneSyllable) {
      const measured = measurePadded(word, speed);
      if (measured === null) continue;
      total += 1;
      spans.push(measured.spanMs);
      for (const name of ["lenient", "balanced", "strict"] as const) if (judgePace(1, measured.spanMs, PACE_PRESETS[name], model.get(audioKey(word)), measured.leadMs).drawnOut) counts[name] += 1;
    }
    const show = (count: number): string => `${Math.round((100 * count) / total)}%`.padStart(6);
    console.log(`x${String(speed).padEnd(5)} ${show(counts.lenient)}   ${show(counts.balanced)}   ${show(counts.strict)}     median ${median(spans)} ms, longest ${Math.max(...spans)} ms`);
  }
}
rmSync(scratch, { recursive: true, force: true });
