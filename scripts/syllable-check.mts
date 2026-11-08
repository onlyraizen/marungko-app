import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { UnitSchema, audioKey } from "../packages/shared/dist/index.js";
import { measure, readWav } from "./lib/audio.mts";

/**
 * Measures every syllable clip and lists the ones that look wrong. It cannot hear: it flags what a ruler can
 * find, so a Filipino teacher only has to listen to the clips that need it.
 *
 *   pnpm content:syllable-check                  table for all syllables of Books 1 to 4
 *   pnpm content:syllable-check -- --words       same checks on the word clips (to see what normal looks like)
 *   pnpm content:syllable-check -- --dir <folder>  check another folder (for example the unzipped recorder download)
 *   add --strict to exit with an error when any clip needs attention (for scripts)
 *   pnpm content:syllable-check -- --quarantine --yes
 *                                                move every old computer-voice syllable clip (not your recording,
 *                                                not picked with pnpm content:syllable-tts) into
 *                                                content/_old-tts-syllables/ (nothing is deleted; move them back to undo)
 *
 * Measured from the audio: length, silence at both ends, loudness, number of vowel "beats" (a one-syllable clip
 * has one; "ma" that says "mabuda" has three), pitch and whether the pitch rises at the end.
 * The beat count and pitch are heuristics (marked "?" in the flags): confirm by listening.
 */

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const flag = (name: string): boolean => args.includes(`--${name}`);
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const dir = option("dir") ?? join(root, "frontend", "assets", "audio", "words");
const metaPath = join(root, "content", "audio-meta.json");
const meta: Record<string, { voice?: string; pickedAt?: string } | undefined> = existsSync(metaPath)
  ? (JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, { voice?: string; pickedAt?: string }>)
  : {};

// Limits (starting values; see docs/SYLLABLE-REWORK.md section 4).
const MAX_LEAD_MS = 60;
const MAX_TAIL_MS = 130;
const MAX_SECONDS = 0.7;
const MIN_SECONDS = 0.15;
const RMS_TOLERANCE_DB = 1.5;
const MAX_PEAK_DB = -0.5;
const MAX_PITCH_GAP_SEMITONES = 5;
const RISING_SEMITONES = 2;

// What to check: every syllable of Books 1 to 4 (unit files 01 to 04), or the word clips with --words.
const books: { key: string; text: string; book: number }[] = [];
const wordKeys: string[] = [];
const unitsDir = join(root, "content", "units");
for (const file of readdirSync(unitsDir).filter((name) => /^0[1-4]-/.test(name)).sort()) {
  const unit = UnitSchema.parse(JSON.parse(readFileSync(join(unitsDir, file), "utf8")));
  const book = Number(file.slice(0, 2));
  for (const text of unit.syllables) books.push({ key: audioKey(text), text, book });
  for (const text of unit.words) wordKeys.push(audioKey(text));
}
const targets = flag("words")
  ? [...new Set(wordKeys)].map((key) => ({ key, text: key, book: 0 }))
  : books;

// Normal pitch of the guide voice, from the word clips already in the app (never from the folder being checked).
const wordsDir = join(root, "frontend", "assets", "audio", "words");
const referencePitches: number[] = [];
for (const key of [...new Set(wordKeys)]) {
  const path = join(wordsDir, `${key}.wav`);
  if (!existsSync(path)) continue;
  const wav = readWav(path);
  const result = wav === null ? null : measure(wav);
  if (result?.pitchHz) referencePitches.push(result.pitchHz);
}
referencePitches.sort((a, b) => a - b);
const referenceHz = referencePitches.length > 0 ? referencePitches[Math.floor(referencePitches.length / 2)] : null;

if (flag("quarantine")) {
  const moveDir = join(root, "content", "_old-tts-syllables");
  const stale = books.filter((entry) => {
    const path = join(wordsDir, `${entry.key}.wav`);
    return existsSync(path) && meta[entry.key]?.voice !== "human" && meta[entry.key]?.pickedAt === undefined;
  });
  console.log(`${stale.length} syllable clip(s) are old computer-voice clips (not your recording, not picked on the page): ${stale.map((entry) => entry.key).join(" ") || "none"}`);
  if (!flag("yes")) {
    console.log("Dry run. Add --yes to move them to content/_old-tts-syllables/ (nothing is deleted).");
    process.exit(0);
  }
  mkdirSync(moveDir, { recursive: true });
  for (const entry of stale) renameSync(join(wordsDir, `${entry.key}.wav`), join(moveDir, `${entry.key}.wav`));
  console.log("Moved. Now run: pnpm content:audio -- --manifest-only --syllables   (rebuilds the list the app plays from)");
  process.exit(0);
}

type Row = { key: string; book: number; source: string; m: Measure | null; flags: string[] };
const rows: Row[] = [];
for (const entry of targets) {
  // The recorder zip names files ma_syllable.wav; the app folder uses ma.wav. Either is found.
  const plain = join(dir, `${entry.key}.wav`);
  const path = existsSync(plain) ? plain : join(dir, `${entry.key}_syllable.wav`);
  const entryMeta = meta[entry.key];
  const source =
    entryMeta?.voice === "human" ? "human" : entryMeta?.pickedAt !== undefined ? "TTS-picked" : entryMeta !== undefined ? "old-TTS" : "unknown";
  const flags: string[] = [];
  const wav = existsSync(path) ? readWav(path) : null;
  if (wav === null) {
    flags.push(existsSync(path) ? "UNREADABLE (need 16-bit WAV)" : "MISSING");
    rows.push({ key: entry.key, book: entry.book, source, m: null, flags });
    continue;
  }
  const m = measure(wav);
  if (!flag("words") && !flag("any-source") && !option("dir") && source !== "human" && source !== "TTS-picked") flags.push("OLD-TTS (replace or pick again)");
  if (m.seconds > MAX_SECONDS && !flag("words")) flags.push(`LONG ${m.seconds.toFixed(2)}s (extra sounds?)`);
  if (m.seconds < MIN_SECONDS) flags.push("TOO-SHORT");
  if ((m.beats >= 3 || (m.beats === 2 && m.seconds > 0.55)) && !flag("words")) flags.push(`BEATS=${m.beats}? (more than one syllable?)`);
  if (m.leadMs > MAX_LEAD_MS) flags.push(`LEAD ${m.leadMs}ms`);
  if (m.tailMs > MAX_TAIL_MS) flags.push(`TAIL ${Math.round(m.tailMs)}ms`);
  if (m.peakDb > MAX_PEAK_DB) flags.push("CLIPPING");
  if (m.pitchMove !== null && m.pitchMove > RISING_SEMITONES && !flag("words")) flags.push(`RISING? +${m.pitchMove.toFixed(1)}st`);
  if (m.pitchHz !== null && referenceHz !== null && Math.abs(12 * Math.log2(m.pitchHz / referenceHz)) > MAX_PITCH_GAP_SEMITONES) {
    flags.push(`VOICE? ${Math.round(m.pitchHz)}Hz vs guide ${Math.round(referenceHz)}Hz`);
  }
  rows.push({ key: entry.key, book: entry.book, source, m, flags });
}

console.log(`Folder: ${dir}`);
console.log(`Guide voice pitch (median of the word clips): ${referenceHz === null ? "unknown" : `${Math.round(referenceHz)} Hz`}\n`);
console.log("clip  book source   secs  lead  tail  rms    peak   beats  pitch   move   flags");
for (const row of rows) {
  const m = row.m;
  const line =
    m === null
      ? "  -     -     -      -     -     -      -      -      -       -"
      : `${m.seconds.toFixed(2).padStart(5)} ${String(m.leadMs).padStart(4)} ${String(Math.round(m.tailMs)).padStart(5)} ${m.rmsDb.toFixed(1).padStart(6)} ${m.peakDb.toFixed(1).padStart(6)} ${String(m.beats).padStart(5)} ${(m.pitchHz === null ? "-" : `${Math.round(m.pitchHz)}`).padStart(6)} ${(m.pitchMove === null ? "-" : m.pitchMove.toFixed(1)).padStart(6)}`;
  console.log(`${row.key.padEnd(5)} ${String(row.book).padStart(3)}  ${row.source.padEnd(7)} ${line}   ${row.flags.join("; ") || "ok"}`);
}
// Loudness is judged against the other clips of this check: the point is that they match each other.
const levels = rows.flatMap((row) => (row.m === null ? [] : [row.m.rmsDb])).sort((a, b) => a - b);
const medianLevel = levels.length > 0 ? levels[Math.floor(levels.length / 2)] : 0;
for (const row of rows) {
  if (row.m !== null && Math.abs(row.m.rmsDb - medianLevel) > RMS_TOLERANCE_DB) {
    row.flags.push(`LEVEL ${row.m.rmsDb.toFixed(1)}dB (median ${medianLevel.toFixed(1)})`);
  }
}
const bad = rows.filter((row) => row.flags.length > 0);
console.log(`\n${rows.length - bad.length} of ${rows.length} clips pass every measurement. ${bad.length} need attention.`);
console.log("Passing the measurements does NOT mean the pronunciation is right: a Filipino teacher must still rate every clip (docs/SYLLABLE-REWORK.md, section 4).");
if (flag("report")) {
  writeFileSync(join(root, "syllable-check.txt"), JSON.stringify(rows, null, 2));
}
process.exit(flag("strict") && bad.length > 0 ? 1 : 0);
