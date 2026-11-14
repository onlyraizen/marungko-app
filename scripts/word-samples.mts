import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { audioKey } from "../packages/shared/dist/index.js";
import { shortenInnerGaps, trimEnds } from "./lib/shorten-gap.mts";

/**
 * Listening samples for the two words that failed before: "mais" (should be ma-ÍS, a clear /i/) and "kanin"
 * (KA-nin, a long stressed "ka" and a fully sounded final "nin"). Makes 6 versions of each with the app's voice,
 * and a page where a native speaker rates them. It cannot hear anything: a person chooses.
 *
 *   pnpm content:word-samples                     dry run: lists the versions, spends nothing
 *   pnpm content:word-samples -- --yes            makes ~/word-samples/mais_A.wav ... kanin_F.wav and index.html
 *   pnpm content:word-samples -- --apply mais=C,kanin=E     copies the chosen versions into the app
 *   pnpm content:word-samples -- --apply kanin=D --gap-ms 60   same, and shortens any pause inside the word to 60 ms
 *   then: pnpm content:normalize-audio -- mais,kanin   (same loudness as the other clips; it does NOT trim: apply already trims to 50 ms / 100 ms)
 *
 * Add --voice Maya (default) or --out-dir <folder>. How Soniox reads each respelling is NOT verified: that is
 * exactly what the listening is for. Recording a real voice (docs/syllable-recorder.html) is still preferred.
 */

const root = join(import.meta.dirname, "..");
const TTS_URL = process.env.SONIOX_TTS_URL ?? "https://tts-rt.soniox.com/tts";
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const voice = option("voice") ?? process.env.SONIOX_TTS_VOICE ?? "Maya";
const outDir = option("out-dir") ?? join(homedir(), "word-samples");

type Variant = { id: string; text: string; speed?: number; changed: string };
const VARIANTS: Record<string, Variant[]> = {
  mais: [
    { id: "A", text: "ma-ís", changed: "accent on the i, hyphen" },
    { id: "B", text: "ma-is", changed: "plain hyphen" },
    { id: "C", text: "ma, is", changed: "comma: two separate sounds" },
    { id: "D", text: "ma... ís", changed: "long pause, accent on the i" },
    { id: "E", text: "maís", speed: 0.85, changed: "accent, slower (0.85)" },
    { id: "F", text: "mah-ees", changed: "English-style respelling (a test; may sound foreign)" },
  ],
  kanin: [
    { id: "A", text: "ka-nin", changed: "plain hyphen" },
    { id: "B", text: "kaa-nin", changed: "doubled a: longer, stressed ka" },
    { id: "C", text: "KA-nin", changed: "capitals on the stressed syllable" },
    { id: "D", text: "ka... nin", changed: "long pause: forces the last sound out" },
    { id: "E", text: "kaa, nin", speed: 0.85, changed: "long ka, comma, slower (0.85)" },
    { id: "F", text: "kanin.", speed: 0.8, changed: "full stop, much slower (0.8)" },
  ],
};

const assetsDir = join(root, "frontend", "assets", "audio", "words");

const apply = option("apply");
if (apply !== undefined) {
  const metaPath = join(root, "content", "audio-meta.json");
  const meta = JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, Record<string, unknown>>;
  for (const pick of apply.split(",")) {
    const [word = "", id = ""] = pick.split("=");
    const variant = VARIANTS[word]?.find((candidate) => candidate.id === id.toUpperCase());
    const file = join(outDir, `${word}_${id.toUpperCase()}.wav`);
    if (!variant || !existsSync(file)) throw new Error(`No sample ${word}_${id}: check the name and ${outDir}`);
    const target = join(assetsDir, `${audioKey(word)}.wav`);
    const gapMs = Number(option("gap-ms") ?? "0");
    const shortened = gapMs > 0 ? shortenInnerGaps(readFileSync(file), gapMs) : null;
    if (shortened) {
      writeFileSync(target, shortened.out);
      console.log(`  cut ${shortened.cutMs} ms of silence inside ${word} (kept ${gapMs} ms).`);
    } else {
      copyFileSync(file, target);
      if (gapMs > 0) console.log(`  no pause longer than ${gapMs} ms found in ${word}: copied as it is.`);
    }
    // Ends: at most 50 ms of silence before the word and 100 ms after it (normalize-audio only sets the loudness).
    const trimmed = trimEnds(readFileSync(target), 50, 100);
    if (trimmed) {
      writeFileSync(target, trimmed.out);
      console.log(`  trimmed ${trimmed.leadCutMs} ms at the start and ${trimmed.trailCutMs} ms at the end of ${word}.`);
    }
    meta[audioKey(word)] = { text: variant.text, voice, model: "tts-rt-v2", language: "tl", variant: `sample ${id.toUpperCase()}`, speed: variant.speed ?? 1, pickedAt: new Date().toISOString() };
    console.log(`Replaced ${word}.wav with version ${id.toUpperCase()} (${variant.text}).`);
  }
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  console.log("Next: pnpm content:normalize-audio   then   pnpm content:audio -- --manifest-only");
  process.exit(0);
}

const total = Object.values(VARIANTS).reduce((sum, list) => sum + list.length, 0);
console.log(`Voice: ${voice}   Folder: ${outDir}   Versions: ${total}`);
for (const [word, list] of Object.entries(VARIANTS)) for (const v of list) console.log(`  ${word}_${v.id}  "${v.text}"  speed ${v.speed ?? 1}  (${v.changed})`);
if (!args.includes("--yes")) {
  console.log("\nDry run: nothing was generated. Add --yes.");
  process.exit(0);
}

const apiKey = process.env.SONIOX_API_KEY?.trim();
if (!apiKey) throw new Error("SONIOX_API_KEY is not set. Run through pnpm so backend/.env is loaded.");
mkdirSync(outDir, { recursive: true });
let failed = 0;
for (const [word, list] of Object.entries(VARIANTS)) {
  for (const v of list) {
    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-rt-v2", language: "tl", voice, audio_format: "wav", text: v.text, sample_rate: 24_000, ...(v.speed ? { speed: v.speed } : {}) }),
      signal: AbortSignal.timeout(20_000),
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!response.ok || buffer.subarray(0, 4).toString("ascii") !== "RIFF") {
      failed += 1;
      console.error(`FAILED ${word}_${v.id}: HTTP ${response.status}`);
      continue;
    }
    writeFileSync(join(outDir, `${word}_${v.id}.wav`), buffer);
    console.log(`made ${word}_${v.id}.wav`);
  }
}

const CRITERIA = ["Stress", "Vowel clarity", "Ending sound", "Speed", "Same voice as the app"];
const rows = Object.entries(VARIANTS)
  .flatMap(([word, list]) => list.map((v) => ({ word, ...v })))
  .map(
    (v) => `<tr data-id="${v.word}_${v.id}"><td><b>${v.word}_${v.id}</b><br><small>${v.changed}</small></td>
<td><audio controls preload="none" src="${v.word}_${v.id}.wav"></audio></td>
${CRITERIA.map((_, i) => `<td><select data-c="${i}"><option></option>${[1, 2, 3, 4, 5].map((n) => `<option>${n}</option>`).join("")}</select></td>`).join("")}
<td class="verdict">?</td></tr>`,
  )
  .join("\n");
writeFileSync(
  join(outDir, "index.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>mais / kanin samples</title>
<style>body{font-family:sans-serif;margin:16px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;text-align:center}.ok{background:#d6f5d6}.no{background:#ffe0e0}</style>
<h2>Native speaker rating: mais = ma-ÍS, kanin = KA-nin</h2>
<p>Score 1-5. <b>Any score below 4 on Stress or Vowel clarity = reject.</b> The best accepted version wins; if none is accepted, record a real voice.</p>
<table><tr><th>Version</th><th>Listen</th>${CRITERIA.map((c) => `<th>${c}</th>`).join("")}<th>Verdict</th></tr>
${rows}</table>
<p>Then run: <code>pnpm content:word-samples -- --apply mais=&lt;letter&gt;,kanin=&lt;letter&gt;</code></p>
<script>document.querySelectorAll("tr[data-id]").forEach(tr=>tr.addEventListener("change",()=>{const s=[...tr.querySelectorAll("select")].map(x=>Number(x.value)||0);const v=tr.querySelector(".verdict");if(s.slice(0,2).some(n=>n&&n<4)){v.textContent="reject";tr.className="no"}else if(s.every(n=>n>=4)){v.textContent="accept";tr.className="ok"}else{v.textContent="?";tr.className=""}}))</script>`,
);
console.log(failed > 0 ? `\n${failed} failed: run again.` : `\nDone. Open ${join(outDir, "index.html")} in a browser and listen.`);
process.exit(failed > 0 ? 1 : 0);
