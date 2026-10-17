import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { UnitSchema, audioKey } from "../packages/shared/dist/index.js";

/**
 * Listening trial: five ways of asking Soniox to say each item. Writes to a folder outside
 * the project, plus a page (index.html) for choosing the best version of each item.
 *
 *   pnpm voice:trial                                  six test words, calm styles
 *   pnpm voice:trial -- --jolly --words 'mama,Tama!'  your own items, cheerful styles
 *   pnpm voice:trial -- --all                         dry run: everything in the content, spends nothing
 *   pnpm voice:trial -- --all --yes                   generate it all
 *   pnpm voice:trial -- --all --new-only --yes        only items that have no audio in the app yet
 *   pnpm voice:trial -- --all --jolly --only phrases,keywords --yes
 *   add --voice <Name> to try another voice, --force to regenerate existing files
 *
 * --only takes any of: words, syllables, phrases, keywords
 * (default: words, phrases, keywords; with --syllables: all four).
 */

const root = join(import.meta.dirname, "..");
const TTS_URL = "https://tts-rt.soniox.com/tts";
const MODEL = "tts-rt-v2";
const LANGUAGE = "tl";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const flag = (name: string): boolean => args.includes(`--${name}`);
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const voice = option("voice") ?? "Maya";
const all = flag("all");
const jolly = flag("jolly");
const outDir =
  option("out-dir") ?? join(homedir(), all ? (jolly ? "voice-trial-jolly" : "voice-trial-all") : "voice-trial");
const choicesPath = join(root, "content", "audio-choices.txt");
const appAudioDir = join(root, "frontend", "assets", "audio", "words");

const groups = new Set(
  (option("only") ?? (flag("syllables") ? "words,syllables,phrases,keywords" : "words,phrases,keywords"))
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);

const bare = (text: string): string => text.replace(/[.!?]+$/, "");
const finished = (text: string): string => (/[.!?]$/.test(text) ? text : `${text}.`);
const cheer = (text: string): string => `${bare(text)}!`;

type Variant = { name: string; make: (text: string) => string; speed?: number };
const calmVariants: Variant[] = [
  { name: "1-plain", make: bare },
  { name: "2-period", make: finished },
  { name: "3-slow", make: (text) => `[slowly] ${finished(text)}` },
  { name: "4-calm-slow", make: (text) => `[calm] [slowly] ${finished(text)}` },
  { name: "5-speed85", make: finished, speed: 0.85 },
];
// Cheerful styles. Only tags from Soniox's documented list. Variant 2 is the default pick.
const jollyVariants: Variant[] = [
  { name: "1-bright", make: cheer },
  { name: "2-happy", make: (text) => `[happy] ${cheer(text)}` },
  { name: "3-delighted", make: (text) => `[delighted] ${cheer(text)}` },
  { name: "4-excited", make: (text) => `[excited] ${cheer(text)}` },
  { name: "5-playful", make: (text) => `[playful] ${cheer(text)}` },
];
const variants = jolly ? jollyVariants : calmVariants;

// What to say, in teaching order.
const items = new Map<string, string>();
if (all) {
  if (groups.has("words") || groups.has("syllables")) {
    const unitsDir = join(root, "content", "units");
    for (const file of readdirSync(unitsDir).filter((name) => name.endsWith(".json")).sort()) {
      const unit = UnitSchema.parse(JSON.parse(readFileSync(join(unitsDir, file), "utf8")));
      if (groups.has("words")) for (const word of unit.words) items.set(audioKey(word), word);
      if (groups.has("syllables")) for (const syllable of unit.syllables) items.set(audioKey(syllable), syllable);
    }
  }
  if (groups.has("phrases")) {
    const phrases = (JSON.parse(readFileSync(join(root, "content", "phrases.json"), "utf8")) as { phrases: string[] })
      .phrases;
    for (const phrase of phrases) items.set(audioKey(phrase), phrase);
  }
  if (groups.has("keywords")) {
    // Example words shown with the syllables ("SA para sa SAGING").
    const keywords = (JSON.parse(readFileSync(join(root, "content", "keywords.json"), "utf8")) as {
      syllables: Record<string, { word: string }>;
    }).syllables;
    for (const entry of Object.values(keywords)) items.set(audioKey(entry.word), entry.word);
  }
} else {
  const words = (option("words") ?? "mama,masa,mesa,sama,dalawa,tatlo").split(",").map((word) => word.trim());
  for (const word of words.filter(Boolean)) items.set(audioKey(word), word);
}

// Leave the audio you already chose and compiled alone.
if (flag("new-only")) {
  for (const key of [...items.keys()]) {
    if (existsSync(join(appAudioDir, `${key}.wav`))) items.delete(key);
  }
}

const fileFor = (key: string, variant: Variant): string => join(outDir, `${key}__${variant.name}.wav`);
const todo = [...items].flatMap(([key, text]) =>
  variants
    .filter((variant) => flag("force") || !existsSync(fileFor(key, variant)))
    .map((variant) => ({ key, text, variant })),
);

const characters = todo.reduce((sum, job) => sum + job.variant.make(job.text).length, 0);
// Upper estimate: input at $4 per 1M tokens (0.3 tokens per character), output at $21.5 per 1M
// tokens (30,000 per hour of speech), counting about one second of speech per clip.
const estimatedUsd = (characters * 0.3 * 4) / 1e6 + (todo.length * (30_000 / 3600) * 21.5) / 1e6;
console.log(`Voice: ${voice}   Model: ${MODEL}   Language: ${LANGUAGE}   Style: ${jolly ? "jolly" : "calm"}`);
console.log(`Items: ${items.size}   clips to generate: ${todo.length}   estimated cost: about $${estimatedUsd.toFixed(3)} (upper estimate)`);

if (all && !flag("yes")) {
  console.log("\nDry run: nothing was generated or spent. Add --yes to generate.");
  process.exit(0);
}
if (items.size === 0) {
  console.log("\nNothing to do: no items selected, or every item already has audio in the app.");
  process.exit(0);
}

const apiKey = process.env.SONIOX_API_KEY?.trim();
if (!apiKey) throw new Error("SONIOX_API_KEY is not set. Run this through pnpm so backend/.env is loaded.");
mkdirSync(outDir, { recursive: true });
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function synthesize(text: string, speed: number | undefined): Promise<Buffer> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        language: LANGUAGE,
        voice,
        audio_format: "wav",
        sample_rate: 24_000,
        text,
        ...(speed !== undefined ? { speed } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (response.ok && buffer.subarray(0, 4).toString("ascii") === "RIFF") return buffer;
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await sleep(1000 * attempt);
      continue;
    }
    throw new Error(`HTTP ${response.status} ${buffer.toString("utf8", 0, 160)}`);
  }
  throw new Error("unreachable");
}

let failures = 0;
for (const [index, job] of todo.entries()) {
  const text = job.variant.make(job.text);
  try {
    writeFileSync(fileFor(job.key, job.variant), await synthesize(text, job.variant.speed));
    console.log(`${String(index + 1).padStart(4)}/${todo.length}  ${job.key}__${job.variant.name}   ${JSON.stringify(text)}`);
  } catch (error) {
    failures += 1;
    console.log(`FAILED  ${job.key}__${job.variant.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
  await sleep(150);
}

// What compile-audio needs to know.
writeFileSync(
  join(outDir, "_trial.json"),
  JSON.stringify(
    { voice, model: MODEL, language: LANGUAGE, variants: variants.map((v) => v.name), items: Object.fromEntries(items) },
    null,
    2,
  ) + "\n",
);

// Existing choices, so the page opens with them already selected.
const existingChoices = new Map<string, number>();
if (existsSync(choicesPath)) {
  for (const line of readFileSync(choicesPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([a-z0-9-]+)\s*=\s*([1-5])\s*$/.exec(line);
    if (match?.[1] && match[2]) existingChoices.set(match[1], Number(match[2]));
  }
}

const esc = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const keys = [...items.keys()];
const sections = [...items]
  .map(([key, text]) => {
    const chosen = existingChoices.get(key) ?? 2;
    const players = variants
      .map(
        (variant, i) =>
          `<label class="v"><span>${i + 1} ${esc(variant.name.slice(2))}</span>` +
          `<audio controls preload="none" src="${key}__${variant.name}.wav"></audio>` +
          `<input type="radio" name="${key}" value="${i + 1}"${chosen === i + 1 ? " checked" : ""}></label>`,
      )
      .join("");
    return `<section><h2>${esc(text)}</h2><div class="row">${players}</div></section>`;
  })
  .join("\n");

const storageKey = `audio-choices-${jolly ? "jolly" : "calm"}-v1`;
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Choose the best audio</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:system-ui,sans-serif;margin:0;padding:16px 16px 260px;max-width:1000px}
h1{font-size:22px} h2{font-size:26px;margin:0 0 6px}
section{border-bottom:1px solid #ccc;padding:12px 0}
.row{display:flex;flex-wrap:wrap;gap:10px}
.v{display:flex;flex-direction:column;gap:4px;border:1px solid #ccc;border-radius:8px;padding:6px;font-size:14px}
.v input{align-self:flex-start;transform:scale(1.4);margin:6px}
audio{width:200px;height:32px}
.bar{position:fixed;left:0;right:0;bottom:0;background:#f4f4f4;border-top:1px solid #999;padding:10px 16px}
textarea{width:100%;height:120px;font-family:monospace}
button{font-size:16px;padding:8px 14px}
</style></head><body>
<h1>Choose the best version of each item (${keys.length} items, voice ${esc(voice)}, ${jolly ? "jolly" : "calm"} styles)</h1>
<p>Play the five versions, then tick the one you like best. Your ticks are saved in this browser. When you are done, press the button and add the result to content/audio-choices.txt.</p>
${sections}
<div class="bar"><button id="copy">Copy my choices</button> <span id="note"></span>
<textarea id="out" readonly></textarea></div>
<script>
var keys = ${JSON.stringify(keys)};
var out = document.getElementById("out");
var note = document.getElementById("note");
function picked(key) {
  var el = document.querySelector('input[name="' + key + '"]:checked');
  return el ? el.value : "2";
}
function lines() {
  return keys.map(function (key) { return key + "=" + picked(key); }).join("\\n");
}
function refresh() {
  out.value = lines();
  try {
    var saved = {};
    keys.forEach(function (key) { saved[key] = picked(key); });
    localStorage.setItem(${JSON.stringify(storageKey)}, JSON.stringify(saved));
  } catch (e) {}
}
try {
  var stored = JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)}) || "{}");
  Object.keys(stored).forEach(function (key) {
    var el = document.querySelector('input[name="' + key + '"][value="' + stored[key] + '"]');
    if (el) el.checked = true;
  });
} catch (e) {}
document.addEventListener("change", refresh);
document.getElementById("copy").onclick = function () {
  refresh();
  out.select();
  var done = function () { note.textContent = "Copied " + keys.length + " lines."; };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(out.value).then(done, function () { note.textContent = "Press Ctrl+C to copy the selected text."; });
  } else {
    note.textContent = "Press Ctrl+C to copy the selected text.";
  }
};
refresh();
</script></body></html>
`;
writeFileSync(join(outDir, "index.html"), page);

console.log(`\n${items.size * variants.length - failures} clips ready in ${outDir}`);
console.log(failures > 0 ? `${failures} failed; run the same command again to retry them.` : "No failures.");
console.log(`Open ${join(outDir, "index.html")} in Chrome to choose.`);
process.exit(failures > 0 ? 1 : 0);
