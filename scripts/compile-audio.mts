import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Copies the version you chose for each item from the listening folder into the app,
 * and brings every clip to a consistent loudness (never clipping).
 *
 *   pnpm content:compile-audio                       uses ~/voice-trial-all
 *   pnpm content:compile-audio -- --from <folder>
 *   add --no-normalize to copy the files unchanged
 *   add --target-rms -14 to make everything louder (default -16), --peak -1 for the ceiling
 *
 * Reads content/audio-choices.txt (key=1..5). Items without a choice use variant 2 (period).
 */

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const trialDir = option("from") ?? join(homedir(), "voice-trial-all");
const choicesPath = join(root, "content", "audio-choices.txt");
const assetsDir = join(root, "frontend", "assets", "audio", "words");
const metaPath = join(root, "content", "audio-meta.json");
const manifestPath = join(root, "frontend", "src", "audio", "manifest.ts");
const DEFAULT_CHOICE = 2;

const normalize = !args.includes("--no-normalize");
const targetRmsDb = Number(option("target-rms") ?? -16);
const peakCeilingDb = Number(option("peak") ?? -1);
const MAX_GAIN_DB = 18;

const toDb = (value: number): number => (value <= 0 ? -120 : 20 * Math.log10(value / 32768));
const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
};

type Normalized = { out: Buffer; beforeRmsDb: number; afterRmsDb: number; gainDb: number; limitedByPeak: boolean };

/** 16-bit mono PCM WAV only. Returns null when the file is something else. */
function normalizeWav(input: Buffer): Normalized | null {
  if (input.length < 44 || input.toString("ascii", 0, 4) !== "RIFF" || input.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }
  let offset = 12;
  let formatOk = false;
  let dataStart = -1;
  let dataLength = 0;
  while (offset + 8 <= input.length) {
    const id = input.toString("ascii", offset, offset + 4);
    const size = input.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      formatOk =
        input.readUInt16LE(body) === 1 && input.readUInt16LE(body + 2) === 1 && input.readUInt16LE(body + 14) === 16;
    } else if (id === "data") {
      dataStart = body;
      const remaining = input.length - body;
      dataLength = size === 0 || size > remaining ? remaining : size;
      break;
    }
    offset = body + size + (size % 2);
  }
  if (!formatOk || dataStart < 0) return null;

  const count = Math.floor(dataLength / 2);
  let peak = 0;
  for (let i = 0; i < count; i += 1) {
    const value = Math.abs(input.readInt16LE(dataStart + i * 2));
    if (value > peak) peak = value;
  }
  if (peak === 0) return null;

  // Loudness of the speech itself: ignore the silence around the word.
  const gate = peak * 0.05;
  let sumSquares = 0;
  let active = 0;
  for (let i = 0; i < count; i += 1) {
    const value = input.readInt16LE(dataStart + i * 2);
    if (Math.abs(value) >= gate) {
      sumSquares += value * value;
      active += 1;
    }
  }
  const beforeRmsDb = toDb(Math.sqrt(sumSquares / Math.max(1, active)));
  const peakGainDb = peakCeilingDb - toDb(peak);
  const rmsGainDb = targetRmsDb - beforeRmsDb;
  const limitedByPeak = peakGainDb < rmsGainDb;
  const gainDb = Math.min(rmsGainDb, peakGainDb, MAX_GAIN_DB);
  const gain = 10 ** (gainDb / 20);

  const out = Buffer.from(input);
  for (let i = 0; i < count; i += 1) {
    const position = dataStart + i * 2;
    const scaled = Math.round(input.readInt16LE(position) * gain);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, scaled)), position);
  }
  out.writeUInt32LE(count * 2, dataStart - 4);
  out.writeUInt32LE(out.length - 8, 4);
  return { out, beforeRmsDb, afterRmsDb: beforeRmsDb + gainDb, gainDb, limitedByPeak };
}

type Trial = { voice: string; model: string; language: string; variants: string[]; items: Record<string, string> };
const trialFile = join(trialDir, "_trial.json");
if (!existsSync(trialFile)) throw new Error(`No _trial.json in ${trialDir}. Run: pnpm voice:trial -- --all --yes`);
const trial = JSON.parse(readFileSync(trialFile, "utf8")) as Trial;

const choices = new Map<string, number>();
if (existsSync(choicesPath)) {
  for (const line of readFileSync(choicesPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([a-z0-9-]+)\s*=\s*([1-5])\s*$/.exec(line);
    if (match?.[1] && match[2]) choices.set(match[1], Number(match[2]));
  }
}

type Meta = Record<
  string,
  { text: string; voice: string; model: string; language: string; variant: string; gainDb: number; compiledAt: string }
>;
const meta: Meta = existsSync(metaPath) ? (JSON.parse(readFileSync(metaPath, "utf8")) as Meta) : {};
mkdirSync(assetsDir, { recursive: true });

let copied = 0;
let usedDefault = 0;
let missing = 0;
let notNormalized = 0;
const beforeLevels: number[] = [];
const afterLevels: number[] = [];
const gains: number[] = [];
let limited = 0;

for (const [key, text] of Object.entries(trial.items)) {
  let choice = choices.get(key);
  if (choice === undefined) {
    choice = DEFAULT_CHOICE;
    usedDefault += 1;
  }
  let variant = trial.variants[choice - 1];
  let source = variant ? join(trialDir, `${key}__${variant}.wav`) : "";
  if (!variant || !existsSync(source)) {
    variant = trial.variants[DEFAULT_CHOICE - 1];
    source = variant ? join(trialDir, `${key}__${variant}.wav`) : "";
    console.warn(`WARNING ${key}: chosen version missing, using the default`);
  }
  if (!variant || !existsSync(source)) {
    missing += 1;
    console.error(`ERROR   ${key}: no audio file found`);
    continue;
  }

  const destination = join(assetsDir, `${key}.wav`);
  let gainDb = 0;
  const result = normalize ? normalizeWav(readFileSync(source)) : null;
  if (result) {
    writeFileSync(destination, result.out);
    gainDb = result.gainDb;
    beforeLevels.push(result.beforeRmsDb);
    afterLevels.push(result.afterRmsDb);
    gains.push(result.gainDb);
    if (result.limitedByPeak) limited += 1;
  } else {
    if (normalize) {
      notNormalized += 1;
      console.warn(`WARNING ${key}: not 16-bit mono PCM; copied unchanged`);
    }
    copyFileSync(source, destination);
  }
  meta[key] = {
    text,
    voice: trial.voice,
    model: trial.model,
    language: trial.language,
    variant,
    gainDb: Math.round(gainDb * 10) / 10,
    compiledAt: new Date().toISOString(),
  };
  copied += 1;
}

mkdirSync(dirname(metaPath), { recursive: true });
writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");

const keys = readdirSync(assetsDir)
  .filter((name) => name.endsWith(".wav"))
  .map((name) => name.slice(0, -4))
  .sort();
const lines = keys.map((key) => `  ${JSON.stringify(key)}: require("../../assets/audio/words/${key}.wav"),`);
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(
  manifestPath,
  `// GENERATED by scripts/generate-audio.mts or scripts/compile-audio.mts. Do not edit by hand.\n` +
    `export const AUDIO: Readonly<Record<string, number>> = {\n${lines.join("\n")}\n};\n`,
);

console.log(`\nCopied ${copied} files into the app (${usedDefault} used the default choice).`);
if (normalize && gains.length > 0) {
  console.log(
    `Loudness of the speech (RMS): median ${median(beforeLevels).toFixed(1)} dBFS before, ` +
      `${median(afterLevels).toFixed(1)} dBFS after (target ${targetRmsDb}).`,
  );
  console.log(
    `Gain applied: from ${Math.min(...gains).toFixed(1)} dB to ${Math.max(...gains).toFixed(1)} dB; ` +
      `${limited} file(s) were held back by the peak ceiling of ${peakCeilingDb} dBFS.`,
  );
}
if (notNormalized > 0) console.log(`${notNormalized} file(s) were not in a format the normalizer handles.`);
console.log(`Manifest lists ${keys.length} audio files.`);
if (missing > 0) console.log(`${missing} item(s) have no audio. Re-run the trial for them.`);
process.exit(missing > 0 ? 1 : 0);
