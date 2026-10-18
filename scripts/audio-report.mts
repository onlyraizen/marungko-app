import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Lists how long every clip is, longest first, and flags the ones that are too long for what they are.
 * A single syllable should be under about 1 s, a word under about 1.6 s.
 *
 *   pnpm content:audio-report
 */

const dir = join(import.meta.dirname, "..", "frontend", "assets", "audio", "words");
type Row = { key: string; seconds: number };
const rows: Row[] = [];
for (const name of readdirSync(dir).filter((file) => file.endsWith(".wav"))) {
  const buffer = readFileSync(join(dir, name));
  if (buffer.toString("ascii", 0, 4) !== "RIFF") continue;
  const sampleRate = buffer.readUInt32LE(24);
  const channels = buffer.readUInt16LE(22);
  let offset = 12;
  let dataLength = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "data") {
      dataLength = size === 0 || size > buffer.length - offset - 8 ? buffer.length - offset - 8 : size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  rows.push({ key: name.replace(/\.wav$/, ""), seconds: dataLength / (sampleRate * channels * 2) });
}
rows.sort((a, b) => b.seconds - a.seconds);
const limit = (key: string): number => (key.length <= 2 ? 1.0 : key.includes("-") ? 99 : 1.6);
console.log(`${rows.length} clips\n`);
for (const row of rows.slice(0, 40)) {
  const flag = row.seconds > limit(row.key) ? "  TOO LONG" : "";
  console.log(`${row.seconds.toFixed(2).padStart(6)} s  ${row.key}${flag}`);
}
const bad = rows.filter((row) => row.seconds > limit(row.key));
console.log(`\n${bad.length} clip(s) too long: ${bad.map((row) => row.key).join(" ")}`);
