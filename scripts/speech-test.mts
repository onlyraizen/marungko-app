import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acceptedFor } from "../frontend/src/content/accepted.ts";
import { syllabify } from "../frontend/src/content/syllables.ts";
import { decideAttempt } from "../frontend/src/speech/attempt.ts";
import { PaceMeter, findSpan } from "../frontend/src/speech/pace.ts";
import { WORD_MS } from "../frontend/src/speech/wordPace.ts";
import { readWav } from "./lib/audio.mts";

/**
 * Checks the whole judging chain with the guide voice's clips as stand-in speech: the microphone meter (fed the way the
 * phone feeds it, in small chunks), the span, the pace verdict and the final decision. It is a simulation (a computer
 * voice, sped up, with synthetic noise), so it proves the logic does what the design says; it does not replace the
 * red-team run with real people (docs/SPEECH-CHECK.md section 5).
 *
 *   pnpm speech:test
 */

const root = join(import.meta.dirname, "..");
const dir = join(root, "frontend", "assets", "audio", "words");
const scratch = mkdtempSync(join(tmpdir(), "speech-"));
let failures = 0;
const rows: string[][] = [["case", "expected", "actual", "reason", "span ms", "ratio"]];

function samplesAt(word: string, speed: number): Int16Array {
  const out = join(scratch, `${word}.${speed}.wav`);
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
  const run = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(dir, `${word}.wav`), "-af", stages.join(","), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", out]);
  if (run.status !== 0) throw new Error("ffmpeg failed");
  const wav = readWav(out);
  if (!wav) throw new Error("bad wav");
  return Int16Array.from(wav.samples, (v) => Math.max(-32768, Math.min(32767, Math.round(v * 32768))));
}

let seed = 12345;
const random = (): number => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296 - 0.5;
};

/** Pads like a real attempt: 400 ms of quiet before and after, optional noise, delivered in 50 ms chunks. */
function listen(speech: Int16Array, noiseDb: number | null): PaceMeter {
  const pad = 6400;
  const all = new Int16Array(pad + speech.length + pad);
  all.set(speech, pad);
  if (noiseDb !== null) {
    const amp = Math.pow(10, noiseDb / 20) * 32768 * 2 * 0.577;
    for (let i = 0; i < all.length; i += 1) all[i] = Math.max(-32768, Math.min(32767, (all[i] ?? 0) + Math.round(random() * amp)));
  }
  const meter = new PaceMeter();
  for (let i = 0; i < all.length; i += 800) meter.push(all.subarray(i, Math.min(all.length, i + 800)));
  return meter;
}

function check(label: string, heard: string, target: string, expected: "correct" | "almost" | "incorrect", speech: Int16Array | null, noiseDb: number | null = null, confidence: number | null = 0.9): void {
  const measured = speech === null ? null : findSpan(listen(speech, noiseDb).frames);
  const span = measured?.spanMs ?? null;
  const decision = decideAttempt({ heard, target, accepted: acceptedFor(target), syllables: syllabify(target).length, spanMs: span, modelMs: WORD_MS[target], leadMs: measured?.startMs ?? null, confidence });
  const ok = decision.result.kind === expected;
  if (!ok) failures += 1;
  rows.push([label, expected, decision.result.kind + (ok ? "" : "  <-- FAIL"), decision.reason, String(span ?? "-"), decision.pace ? decision.pace.ratio.toFixed(2) : "-"]);
}

if (!existsSync(join(dir, "pato.wav"))) throw new Error("pato.wav is missing");
for (const word of ["pato", "bahay", "kabayo", "bulaklak", "ilong"]) {
  if (!existsSync(join(dir, `${word}.wav`))) continue;
  check(`${word} slow and clear (x0.8)`, word, word, "correct", samplesAt(word, 0.8));
  check(`${word} normal (x1)`, word, word, "correct", samplesAt(word, 1));
  check(`${word} a bit fast (x1.25)`, word, word, "correct", samplesAt(word, 1.25));
  check(`${word} very fast (x2)`, word, word, "almost", samplesAt(word, 2));
  check(`${word} extreme (x3)`, word, word, "almost", samplesAt(word, 3));
}
const pato = samplesAt("pato", 1);
check("pato, wrong word", "bato", "pato", "almost", pato); // one letter off: a retry, never a pass
check("pato, far word", "mama", "pato", "incorrect", pato);
check("pato, silence", "", "pato", "incorrect", null);
check("pato, syllables apart", "pa to", "pato", "correct", samplesAt("pato", 0.8));
check("pato, rushed, noise -50 dB", "pato", "pato", "almost", samplesAt("pato", 2), -50);
check("pato, rushed, noise -40 dB", "pato", "pato", "almost", samplesAt("pato", 2), -40);
check("pato, rushed, noise -30 dB (loud room)", "pato", "pato", "correct", samplesAt("pato", 2), -30); // known limit: noise hides the pace
check("pato, speech not measurable", "pato", "pato", "correct", null);
check("ye heard as yeah, clear", "yeah", "ye", "correct", samplesAt("yelo", 1).subarray(0, 4800), null);
check("ye, a 60 ms burst only (a blur)", "yeah", "ye", "almost", Int16Array.from({ length: 960 }, (_, i) => Math.round(8000 * Math.sin(i * 0.3))));
check("ye, one click (nothing to measure)", "yeah", "ye", "correct", new Int16Array(160).fill(12000)); // not measurable: the text decides

// One syllable must be "moh", not "moooo". The guide's clip slowed down stands in for a held vowel.
for (const syllable of ["mo", "ma", "se", "ku"]) {
  if (!existsSync(join(dir, `${syllable}.wav`))) continue;
  const accepted = acceptedFor(syllable)[0] ?? syllable;
  check(`${syllable} normal (x1)`, syllable, syllable, "correct", samplesAt(syllable, 1));
  check(`${syllable} said as "${accepted}", normal`, accepted, syllable, "correct", samplesAt(syllable, 1));
  check(`${syllable} a little slow (x0.7)`, syllable, syllable, "correct", samplesAt(syllable, 0.7));
  check(`${syllable} held, about 3x (x0.33)`, syllable, syllable, "almost", samplesAt(syllable, 0.33));
  check(`${syllable} held very long (x0.2)`, syllable, syllable, "almost", samplesAt(syllable, 0.2));
  check(`${syllable} held, but the wrong sound`, "na", syllable, "incorrect", samplesAt(syllable, 0.33)); // text still decides: never a pass
}
if (existsSync(join(dir, "mo.wav"))) {
  check("mo held, quiet room noise -50 dB", "mo", "mo", "almost", samplesAt("mo", 0.33), -50);
  check("mo held, loud room -30 dB", "mo", "mo", "correct", samplesAt("mo", 0.33), -30); // known limit: noise from the first moment, nothing to measure against
}

console.log(rows.map((row) => row.map((cell, i) => cell.padEnd([40, 9, 20, 10, 8, 6][i] ?? 8)).join(" ")).join("\n"));
console.log(failures === 0 ? "\nAll cases behave as designed." : `\n${failures} case(s) differ from the design.`);
rmSync(scratch, { recursive: true, force: true });
process.exit(failures > 0 ? 1 : 0);
