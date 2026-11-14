import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, parse } from "node:path";
import { UnitSchema, audioKey } from "../packages/shared/dist/index.js";

/**
 * Brings YOUR OWN recordings into the app. Record each item as its own file (phone voice recorder is fine),
 * put them in one folder, and run:
 *
 *   pnpm content:import-voice -- --from ~/my-voice          dry run: shows what would be imported
 *   pnpm content:import-voice -- --from ~/my-voice --yes    convert and copy into the app
 *
 * File names: ma.m4a, ma_syllable.wav, m_sound.wav, saging_word.mp3 ... (any of wav, m4a, mp3, aac, ogg, flac).
 * A trailing _sound / _syllable / _word / _phrase is ignored. Each file is trimmed, made mono 24 kHz 16-bit WAV
 * and saved as the app's clip for that item, replacing any computer-voice clip of the same name.
 * Needs ffmpeg (Windows: winget install Gyan.FFmpeg, then reopen the terminal).
 * Afterwards run: pnpm content:normalize-audio   then   pnpm content:audio -- --manifest-only --syllables
 */

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const from = option("from");
if (from === undefined) throw new Error("Give the folder with your recordings: --from <folder>");
if (!existsSync(from)) throw new Error(`Folder not found: ${from}`);

const assetsDir = join(root, "frontend", "assets", "audio", "words");
const metaPath = join(root, "content", "audio-meta.json");
const AUDIO_EXT = new Set([".wav", ".m4a", ".mp3", ".aac", ".ogg", ".flac", ".opus"]);

// Everything the app can say, so a typo in a file name is caught instead of silently ignored.
const known = new Map<string, string>();
const unitsDir = join(root, "content", "units");
for (const file of readdirSync(unitsDir).filter((name) => name.endsWith(".json")).sort()) {
  const unit = UnitSchema.parse(JSON.parse(readFileSync(join(unitsDir, file), "utf8")));
  for (const text of [...unit.words, ...unit.syllables, ...unit.sounds]) known.set(audioKey(text), text);
}
const phrases = (JSON.parse(readFileSync(join(root, "content", "phrases.json"), "utf8")) as { phrases: string[] }).phrases;
for (const phrase of phrases) known.set(audioKey(phrase), phrase);

const files = readdirSync(from).filter((name) => AUDIO_EXT.has(extname(name).toLowerCase())).sort();
const plan: { file: string; key: string }[] = [];
for (const file of files) {
  const base = parse(file).name.replace(/[_-](sound|syllable|word|phrase)$/i, "");
  const key = audioKey(base.replace(/_/g, " "));
  if (!known.has(key)) {
    console.warn(`SKIPPED ${file}: "${key}" is not an item in the lessons.`);
    continue;
  }
  plan.push({ file, key });
}
console.log(`${plan.length} recording(s) ready from ${from}.`);
const have = new Set(plan.map((entry) => entry.key));
const missingSounds = [...known.keys()].filter((key) => key.length <= 2 && !have.has(key) && !existsSync(join(assetsDir, `${key}.wav`)));
if (missingSounds.length > 0) console.log(`Short items still without any clip: ${missingSounds.join(" ")}`);

if (!args.includes("--yes")) {
  for (const entry of plan) console.log(`  ${entry.file}  ->  ${entry.key}.wav`);
  console.log("\nDry run: nothing was changed. Add --yes to import.");
  process.exit(0);
}

const probe = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
if (probe.error !== undefined || probe.status !== 0) {
  throw new Error("ffmpeg was not found. Windows: winget install Gyan.FFmpeg  (then close and reopen Git Bash).");
}

// Cut silence from both ends (keeps a short, even lead-in), then 24 kHz mono 16-bit.
const trim = "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.04";
const filter = `${trim},areverse,${trim},areverse,apad=pad_dur=0.06`;
mkdirSync(assetsDir, { recursive: true });
const scratch = mkdtempSync(join(tmpdir(), "import-voice-"));
type Meta = Record<string, Record<string, unknown>>;
const meta: Meta = existsSync(metaPath) ? (JSON.parse(readFileSync(metaPath, "utf8")) as Meta) : {};
let failed = 0;
for (const entry of plan) {
  const temporary = join(scratch, `${entry.key}.wav`);
  const run = spawnSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-i", join(from, entry.file), "-af", filter, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", temporary],
    { encoding: "utf8" },
  );
  if (run.status !== 0 || !existsSync(temporary)) {
    failed += 1;
    console.error(`FAILED ${entry.file}: ${run.stderr.trim().slice(0, 200)}`);
    continue;
  }
  copyFileSync(temporary, join(assetsDir, `${entry.key}.wav`));
  meta[entry.key] = { text: known.get(entry.key) ?? entry.key, voice: "human", model: "recording", language: "tl", importedAt: new Date().toISOString() };
  console.log(`  ${entry.file}  ->  ${entry.key}.wav`);
}
rmSync(scratch, { recursive: true, force: true });
writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
console.log(failed > 0 ? `\n${failed} file(s) failed.` : "\nDone. Next: pnpm content:normalize-audio, then pnpm content:audio -- --manifest-only --syllables");
process.exit(failed > 0 ? 1 : 0);
