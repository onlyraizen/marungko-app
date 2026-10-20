import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { UnitSchema, audioKey } from "../packages/shared/dist/index.js";

/**
 * Brings freshly generated clips to the same loudness as the rest of the guide voice,
 * the same way `content:compile-audio` does (speech level -16 dB RMS, never above -1 dB peak).
 * Run it after `pnpm content:audio -- --yes --syllables`:
 *
 *   pnpm content:normalize-audio                 every syllable clip
 *   pnpm content:normalize-audio -- ti,sa,ba     only these clips
 *
 * Safe to run twice: a clip that is already at the target level is left as it is.
 */

const root = join(import.meta.dirname, "..");
const dir = join(root, "frontend", "assets", "audio", "words");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const TARGET_RMS_DB = -16;
const PEAK_DB = -1;
const MAX_GAIN_DB = 18;

const toDb = (value: number): number => (value <= 0 ? -120 : 20 * Math.log10(value / 32768));

/** 16-bit mono PCM WAV only. Returns null for anything else. */
function normalizeWav(input: Buffer): { out: Buffer; gainDb: number } | null {
  if (input.length < 44 || input.toString("ascii", 0, 4) !== "RIFF" || input.toString("ascii", 8, 12) !== "WAVE") return null;
  let offset = 12;
  let formatOk = false;
  let dataStart = -1;
  let dataLength = 0;
  while (offset + 8 <= input.length) {
    const id = input.toString("ascii", offset, offset + 4);
    const size = input.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      formatOk = input.readUInt16LE(body) === 1 && input.readUInt16LE(body + 2) === 1 && input.readUInt16LE(body + 14) === 16;
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
  for (let i = 0; i < count; i += 1) peak = Math.max(peak, Math.abs(input.readInt16LE(dataStart + i * 2)));
  if (peak === 0) return null;
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
  const rmsDb = toDb(Math.sqrt(sumSquares / Math.max(1, active)));
  const gainDb = Math.min(TARGET_RMS_DB - rmsDb, PEAK_DB - toDb(peak), MAX_GAIN_DB);
  const gain = 10 ** (gainDb / 20);
  const out = Buffer.from(input);
  for (let i = 0; i < count; i += 1) {
    const position = dataStart + i * 2;
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(input.readInt16LE(position) * gain))), position);
  }
  return { out, gainDb };
}

let keys: string[];
if (args[0] !== undefined) {
  keys = args[0].split(",").map((name) => audioKey(name.trim())).filter((key) => key !== "");
} else {
  const set = new Set<string>();
  const unitsDir = join(root, "content", "units");
  for (const file of readdirSync(unitsDir).filter((name) => name.endsWith(".json"))) {
    const unit = UnitSchema.parse(JSON.parse(readFileSync(join(unitsDir, file), "utf8")));
    for (const syllable of unit.syllables) set.add(audioKey(syllable));
  }
  keys = [...set];
}

let done = 0;
for (const key of keys.sort()) {
  const path = join(dir, `${key}.wav`);
  if (!existsSync(path)) {
    console.warn(`missing  ${key}.wav (generate it first)`);
    continue;
  }
  const result = normalizeWav(readFileSync(path));
  if (!result) {
    console.warn(`skipped  ${key}.wav (not 16-bit mono PCM)`);
    continue;
  }
  writeFileSync(path, result.out);
  done += 1;
  console.log(`${key.padEnd(6)} ${result.gainDb >= 0 ? "+" : ""}${result.gainDb.toFixed(1)} dB`);
}
console.log(`\nNormalized ${done} of ${keys.length} clips.`);
