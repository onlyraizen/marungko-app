import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { UnitSchema, audioKey } from "../packages/shared/dist/index.js";

/**
 * Generates the spoken guide audio once, on this laptop, with Soniox text-to-speech.
 * The app only plays the saved files; it makes no text-to-speech calls.
 *
 *   pnpm content:audio                        dry run: counts items, estimates cost, spends nothing
 *   pnpm content:audio -- --yes               generate every missing file
 *   pnpm content:audio -- --yes --syllables   include the syllables too
 *   pnpm content:audio -- --yes --only mama,masa --voice Victoria
 *                                             re-take specific words with another voice
 *   add --out-dir <folder> to write trial files somewhere else (nothing in the app changes)
 */

const root = join(import.meta.dirname, "..");
const TTS_URL = "https://tts-rt.soniox.com/tts";
const MODEL = "tts-rt-v2";
const LANGUAGE = "tl";
const SAMPLE_RATE = 24_000;

// Cost estimate only. Rates: Soniox pricing page, Oct 2026 (re-check before relying on it).
const INPUT_TOKENS_PER_CHAR = 0.3;
const OUTPUT_TOKENS_PER_SECOND = 30_000 / 3_600;
const SECONDS_PER_CHAR = 0.2; // measured: "mama" (4 characters) is about 0.75 s
const INPUT_USD_PER_MILLION = 4.0;
const OUTPUT_USD_PER_MILLION = 21.5;

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const flag = (name: string): boolean => args.includes(`--${name}`);
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const voice = option("voice") ?? process.env.SONIOX_TTS_VOICE ?? "Maya";
const outDirOption = option("out-dir");
const bundleMode = outDirOption === undefined;
const audioDir = outDirOption ?? join(root, "frontend", "assets", "audio", "words");
const metaPath = join(root, "content", "audio-meta.json");
const manifestPath = join(root, "frontend", "src", "audio", "manifest.ts");

type Item = { key: string; text: string; kind: "word" | "syllable" | "phrase" };
const items = new Map<string, Item>();

function add(text: string, kind: Item["kind"]): void {
  const key = audioKey(text);
  if (key === "") return;
  const existing = items.get(key);
  if (existing !== undefined && existing.text !== text) {
    throw new Error(`"${existing.text}" and "${text}" both map to the file name "${key}". Rename one.`);
  }
  if (existing === undefined) items.set(key, { key, text, kind });
}

const unitsDir = join(root, "content", "units");
for (const file of readdirSync(unitsDir).filter((name) => name.endsWith(".json")).sort()) {
  const unit = UnitSchema.parse(JSON.parse(readFileSync(join(unitsDir, file), "utf8")));
  for (const word of unit.words) add(word, "word");
  if (flag("syllables")) for (const syllable of unit.syllables) add(syllable, "syllable");
}
const phrases = (JSON.parse(readFileSync(join(root, "content", "phrases.json"), "utf8")) as { phrases: string[] })
  .phrases;
for (const phrase of phrases) add(phrase, "phrase");

const only = option("only")
  ?.split(",")
  .map((name) => audioKey(name.trim()))
  .filter((key) => key !== "");
if (only !== undefined) {
  for (const key of only) if (!items.has(key)) console.warn(`WARNING "${key}" is not in the content; skipped.`);
}

const fileFor = (key: string): string => join(audioDir, `${key}.wav`);
const wanted = [...items.values()].filter((item) => only === undefined || only.includes(item.key));
const todo = wanted.filter((item) => only !== undefined || flag("force") || !existsSync(fileFor(item.key)));
const characters = todo.reduce((sum, item) => sum + item.text.length, 0);
const estimatedUsd =
  (characters * INPUT_TOKENS_PER_CHAR * INPUT_USD_PER_MILLION) / 1e6 +
  (characters * SECONDS_PER_CHAR * OUTPUT_TOKENS_PER_SECOND * OUTPUT_USD_PER_MILLION) / 1e6;

console.log(`Voice: ${voice}   Model: ${MODEL}   Language: ${LANGUAGE}`);
console.log(`Folder: ${audioDir}`);
console.log(`Items in the content: ${items.size}   already generated: ${wanted.length - todo.length}   to generate now: ${todo.length}`);
console.log(`Characters to send: ${characters}   estimated cost: about $${estimatedUsd.toFixed(3)} (estimate only)`);

if (!flag("yes") && !flag("manifest-only")) {
  console.log("\nDry run: nothing was generated or spent. Add --yes to generate.");
  process.exit(0);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function synthesize(text: string, apiKey: string): Promise<Buffer> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        language: LANGUAGE,
        voice,
        audio_format: "wav",
        text,
        sample_rate: SAMPLE_RATE,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.subarray(0, 4).toString("ascii") !== "RIFF") {
        throw new Error(`reply was not WAV audio: ${buffer.toString("utf8", 0, 200)}`);
      }
      return buffer;
    }
    const body = (await response.text()).slice(0, 300);
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await sleep(1000 * attempt);
      continue;
    }
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
  throw new Error("unreachable");
}

let failures = 0;
if (!flag("manifest-only") && todo.length > 0) {
  const apiKey = process.env.SONIOX_API_KEY?.trim();
  if (!apiKey) throw new Error("SONIOX_API_KEY is not set. Run through pnpm so backend/.env is loaded.");
  mkdirSync(audioDir, { recursive: true });

  type Meta = Record<string, { text: string; voice: string; model: string; language: string; generatedAt: string }>;
  const meta: Meta =
    bundleMode && existsSync(metaPath) ? (JSON.parse(readFileSync(metaPath, "utf8")) as Meta) : {};

  for (const [index, item] of todo.entries()) {
    try {
      writeFileSync(fileFor(item.key), await synthesize(item.text, apiKey));
      meta[item.key] = {
        text: item.text,
        voice,
        model: MODEL,
        language: LANGUAGE,
        generatedAt: new Date().toISOString(),
      };
      console.log(`${String(index + 1).padStart(3)}/${todo.length}  ${item.key}`);
    } catch (error) {
      failures += 1;
      console.error(`FAILED  ${item.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await sleep(150);
  }
  if (bundleMode) {
    mkdirSync(dirname(metaPath), { recursive: true });
    writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  }
}

if (bundleMode) {
  const keys = [...items.keys()].filter((key) => existsSync(fileFor(key))).sort();
  const lines = keys.map((key) => `  ${JSON.stringify(key)}: require("../../assets/audio/words/${key}.wav"),`);
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(
    manifestPath,
    `// GENERATED by scripts/generate-audio.mts. Do not edit by hand.\n` +
      `export const AUDIO: Readonly<Record<string, number>> = {\n${lines.join("\n")}\n};\n`,
  );
  console.log(`\nWrote the app manifest: ${keys.length} audio files.`);
}
console.log(failures > 0 ? `\n${failures} item(s) failed; run again to retry them.` : "\nDone.");
process.exit(failures > 0 ? 1 : 0);
