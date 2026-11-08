import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { UnitSchema, audioKey } from "../packages/shared/dist/index.js";

/**
 * Measures every syllable clip and lists the ones that look wrong. It cannot hear: it flags what a ruler can
 * find, so a Filipino teacher only has to listen to the clips that need it.
 *
 *   pnpm content:syllable-check                  table for all syllables of Books 1 to 4
 *   pnpm content:syllable-check -- --words       same checks on the word clips (to see what normal looks like)
 *   pnpm content:syllable-check -- --dir <folder>  check another folder (for example the unzipped recorder download)
 *   add --strict to exit with an error when any clip needs attention (for scripts)
 *   pnpm content:syllable-check -- --quarantine --yes
 *                                                move every syllable clip that is not your own recording into
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
const meta: Record<string, { voice?: string } | undefined> = existsSync(metaPath)
  ? (JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, { voice?: string }>)
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

type Wav = { samples: Float32Array; rate: number };

function readWav(path: string): Wav | null {
  const buffer = readFileSync(path);
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  let offset = 12;
  let rate = 0;
  let bits = 0;
  let channels = 1;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      channels = buffer.readUInt16LE(body + 2);
      rate = buffer.readUInt32LE(body + 4);
      bits = buffer.readUInt16LE(body + 14);
    } else if (id === "data") {
      if (bits !== 16) return null;
      const length = size === 0 || size > buffer.length - body ? buffer.length - body : size;
      const frames = Math.floor(length / (2 * channels));
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i += 1) samples[i] = buffer.readInt16LE(body + i * 2 * channels) / 32768;
      return { samples, rate };
    }
    offset = body + size + (size % 2);
  }
  return null;
}

const toDb = (value: number): number => (value <= 1e-6 ? -120 : 20 * Math.log10(value));

type Measure = {
  seconds: number;
  leadMs: number;
  tailMs: number;
  peakDb: number;
  rmsDb: number;
  beats: number;
  pitchHz: number | null;
  pitchMove: number | null; // semitones, last third minus first third of the voiced part
};

function measure({ samples, rate }: Wav): Measure {
  const hop = Math.round(rate * 0.01);
  const count = Math.floor(samples.length / hop);
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const env: number[] = [];
  for (let f = 0; f < count; f += 1) {
    let sum = 0;
    for (let i = f * hop; i < (f + 1) * hop; i += 1) sum += samples[i] * samples[i];
    env.push(toDb(Math.sqrt(sum / hop)));
  }
  const maxEnv = Math.max(...env);
  const gate = Math.max(maxEnv - 40, -60); // "sound" means within 40 dB of the loudest part
  const first = env.findIndex((value) => value > gate);
  const last = env.length - 1 - [...env].reverse().findIndex((value) => value > gate);
  const leadMs = first < 0 ? 0 : first * 10;
  const tailMs = last < 0 ? 0 : (env.length - 1 - last) * 10 + (samples.length - count * hop) / rate * 1000;

  // Loudness over the sound part only (what normalize-audio targets).
  let sum = 0;
  let n = 0;
  for (let f = Math.max(first, 0); f <= last; f += 1) {
    if (env[f] > maxEnv - 25) {
      for (let i = f * hop; i < (f + 1) * hop; i += 1) sum += samples[i] * samples[i];
      n += hop;
    }
  }
  const rmsDb = n > 0 ? toDb(Math.sqrt(sum / n)) : -120;

  // Beats: peaks of the smoothed loudness curve that are separated by a clear dip. One syllable = one beat.
  const smooth = env.map((_, f) => {
    const slice = env.slice(Math.max(0, f - 1), f + 2);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
  let beats = 0;
  let climbing = true;
  let top = -Infinity;
  let valley = Infinity;
  for (let f = Math.max(first, 0); f <= last; f += 1) {
    const value = smooth[f];
    if (value < maxEnv - 30) continue;
    if (climbing) {
      if (value > top) top = value;
      else if (top - value >= 7) {
        beats += 1;
        climbing = false;
        valley = value;
      }
    } else {
      if (value < valley) valley = value;
      else if (value - valley >= 7 && value > maxEnv - 22) {
        climbing = true;
        top = value;
      }
    }
  }
  if (climbing && top > -Infinity) beats += 1;

  // Pitch: strongest repeat period between 70 and 400 Hz, on the loud frames only.
  const win = Math.round(rate * 0.04);
  const minLag = Math.round(rate / 400);
  const maxLag = Math.round(rate / 70);
  const pitches: { t: number; hz: number }[] = [];
  for (let f = Math.max(first, 0); f <= last; f += 1) {
    if (env[f] < maxEnv - 20) continue;
    const start = f * hop;
    if (start + win + maxLag >= samples.length) break;
    let energy = 0;
    for (let i = 0; i < win; i += 1) energy += samples[start + i] * samples[start + i];
    if (energy < 1e-6) continue;
    let bestLag = 0;
    let best = 0;
    for (let lag = minLag; lag <= maxLag; lag += 1) {
      let cross = 0;
      let other = 0;
      for (let i = 0; i < win; i += 1) {
        cross += samples[start + i] * samples[start + i + lag];
        other += samples[start + i + lag] * samples[start + i + lag];
      }
      const score = cross / Math.sqrt(energy * other + 1e-12);
      if (score > best) {
        best = score;
        bestLag = lag;
      }
    }
    if (best > 0.6 && bestLag > 0) pitches.push({ t: f, hz: rate / bestLag });
  }
  let pitchHz: number | null = null;
  let pitchMove: number | null = null;
  if (pitches.length >= 6) {
    const hz = pitches.map((p) => p.hz).sort((a, b) => a - b);
    pitchHz = hz[Math.floor(hz.length / 2)];
    const med = (list: number[]): number => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
    const third = Math.floor(pitches.length / 3);
    const head = med(pitches.slice(0, third).map((p) => p.hz));
    const tail = med(pitches.slice(pitches.length - third).map((p) => p.hz));
    pitchMove = 12 * Math.log2(tail / head);
  }
  return { seconds: samples.length / rate, leadMs, tailMs, peakDb: toDb(peak), rmsDb, beats, pitchHz, pitchMove };
}

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
    return existsSync(path) && meta[entry.key]?.voice !== "human";
  });
  console.log(`${stale.length} syllable clip(s) are not your own recording: ${stale.map((entry) => entry.key).join(" ") || "none"}`);
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
  const source = meta[entry.key]?.voice === "human" ? "human" : meta[entry.key] !== undefined ? "TTS" : "unknown";
  const flags: string[] = [];
  const wav = existsSync(path) ? readWav(path) : null;
  if (wav === null) {
    flags.push(existsSync(path) ? "UNREADABLE (need 16-bit WAV)" : "MISSING");
    rows.push({ key: entry.key, book: entry.book, source, m: null, flags });
    continue;
  }
  const m = measure(wav);
  if (!flag("words") && !flag("any-source") && !option("dir") && source !== "human") flags.push("NOT-HUMAN (replace)");
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
