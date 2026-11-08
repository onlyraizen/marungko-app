import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { audioKey } from "../packages/shared/dist/index.js";
import { cut, encodeWav, measure, readWav, sounds } from "./lib/audio.mts";

/**
 * Computer-voice syllables, done carefully. A bare "ma" sent to text-to-speech can come back as "mabuda"; the
 * engine invents sounds around a text that is too short to be a word. This script gives the engine more to hold
 * on to and then cuts out only the syllable:
 *
 *   plain   "ma."                  one try at normal speed
 *   slow    "ma." at speed 0.85    slower, same voice
 *   commas  "ma, ma, ma."          the engine says it three times; the MIDDLE one is kept
 *   dots    "ma... ma... ma."      same with longer pauses; the middle one is kept
 *
 * Every candidate is trimmed (about 40 ms before, 60 ms after), faded at the cut, set to one loudness and
 * measured. Candidates that are too long, have extra sounds or have no clear middle sound are marked. YOU choose
 * by ear on the page: it does not pick for you, and it cannot hear. If none is right, pick "I will record it".
 *
 *   pnpm content:syllable-tts                       dry run: counts requests, spends nothing
 *   pnpm content:syllable-tts -- --yes              generate into ~/syllable-tts, then open index.html there
 *   add --only ma,sa to do some syllables; --voice Maya; --out-dir <folder>
 *
 * Then, with the picks file the page downloads:
 *   pnpm content:apply-picks -- --picks ~/Downloads/syllable-picks.txt --from ~/syllable-tts --yes
 *   pnpm content:normalize-audio
 *   pnpm content:audio -- --manifest-only --syllables
 */

const root = join(import.meta.dirname, "..");
const TTS_URL = process.env.SONIOX_TTS_URL ?? "https://tts-rt.soniox.com/tts";
const MODEL = "tts-rt-v2";
const LANGUAGE = "tl";
const SAMPLE_RATE = 24_000;
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const flag = (name: string): boolean => args.includes(`--${name}`);
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const voice = option("voice") ?? process.env.SONIOX_TTS_VOICE ?? "Maya";
const outDir = option("out-dir") ?? join(homedir(), "syllable-tts");
const LEAD_MS = 40;
const TAIL_MS = 60;
const LEVEL_DB = -17;
const MAX_SECONDS = 0.7;
const MIN_SECONDS = 0.15;

type Guide = { syllable: string; book: number; ipa: string; note: string; reported: boolean; stop: boolean; english: string };
const guide = JSON.parse(readFileSync(join(root, "content", "syllable-guide.json"), "utf8")) as Guide[];
const only = option("only")?.split(",").map((name) => audioKey(name.trim()));
const list = guide.filter((entry) => only === undefined || only.includes(entry.syllable));

const respellPath = join(root, "content", "tts-respell.json");
const respell: Record<string, string> = existsSync(respellPath) ? (JSON.parse(readFileSync(respellPath, "utf8")) as Record<string, string>) : {};
const wordFor = (syllable: string): string => respell[syllable] ?? syllable;

type Variant = { id: string; label: string; text: (s: string) => string; speed?: number; middleOf?: number };
const variants: Variant[] = [
  { id: "plain", label: "plain", text: (s) => `${s}.` },
  { id: "slow", label: "slower (0.85)", text: (s) => `${s}.`, speed: 0.85 },
  { id: "commas", label: "said 3 times, middle kept", text: (s) => `${s}, ${s}, ${s}.`, middleOf: 3 },
  { id: "dots", label: "3 times with pauses, middle kept", text: (s) => `${s}... ${s}... ${s}.`, middleOf: 3 },
];

console.log(`Voice ${voice}, model ${MODEL}, language ${LANGUAGE}. ${list.length} syllables x ${variants.length} versions = ${list.length * variants.length} requests (a few characters each: a few cents at most).`);
if (!flag("yes")) {
  console.log("Dry run: nothing generated or spent. Add --yes to generate.");
  process.exit(0);
}
const apiKey = process.env.SONIOX_API_KEY?.trim();
if (!apiKey) throw new Error("SONIOX_API_KEY is not set. Run through pnpm so backend/.env is loaded.");

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
async function synthesize(text: string, speed?: number): Promise<Buffer> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, language: LANGUAGE, voice, audio_format: "wav", text, sample_rate: SAMPLE_RATE, ...(speed !== undefined ? { speed } : {}) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.subarray(0, 4).toString("ascii") !== "RIFF") throw new Error(`reply was not WAV audio: ${buffer.toString("utf8", 0, 200)}`);
      return buffer;
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await sleep(1000 * attempt);
      continue;
    }
    throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  throw new Error("unreachable");
}

type Result = {
  syllable: string;
  variant: string;
  label: string;
  ok: boolean;
  problems: string[];
  seconds: number;
  beats: number;
  move: number | null;
  hz: number | null;
};
const rawDir = join(outDir, "raw");
mkdirSync(rawDir, { recursive: true });
const results: Result[] = [];
let failures = 0;

for (const entry of list) {
  for (const variant of variants) {
    const raw = join(rawDir, `${entry.syllable}.${variant.id}.wav`);
    const final = join(outDir, `${entry.syllable}.${variant.id}.wav`);
    const problems: string[] = [];
    try {
      if (!existsSync(raw)) {
        writeFileSync(raw, await synthesize(variant.text(wordFor(entry.syllable)), variant.speed));
        await sleep(120);
      }
      const wav = readWav(raw);
      if (wav === null) throw new Error("reply was not 16-bit WAV");
      // Gaps of 70 ms or more separate the sounds the engine said.
      const parts = sounds(wav.samples, wav.rate, 70);
      let chosen: { start: number; end: number } | undefined;
      if (variant.middleOf !== undefined) {
        if (parts.length === variant.middleOf) chosen = parts[1];
        else problems.push(`expected ${variant.middleOf} separate sounds, heard ${parts.length}`);
      } else {
        chosen = parts[0];
        if (parts.length > 1) problems.push(`${parts.length} separate sounds in one clip (extra sounds): kept the first`);
      }
      if (chosen === undefined) {
        results.push({ syllable: entry.syllable, variant: variant.id, label: variant.label, ok: false, problems, seconds: 0, beats: 0, move: null, hz: null });
        continue;
      }
      const clip = cut(wav.samples, wav.rate, chosen.start, chosen.end, LEAD_MS, TAIL_MS, LEVEL_DB);
      writeFileSync(final, encodeWav(clip, wav.rate));
      const m = measure({ samples: clip, rate: wav.rate });
      const sound = m.seconds - (LEAD_MS + TAIL_MS) / 1000;
      if (sound > MAX_SECONDS) problems.push(`long (${sound.toFixed(2)} s): extra sounds?`);
      if (sound < MIN_SECONDS) problems.push("very short");
      if (m.beats >= 3 || (m.beats === 2 && sound > 0.55)) problems.push(`${m.beats} vowel beats?`);
      if (m.pitchMove !== null && m.pitchMove > 2) problems.push(`pitch rises at the end (+${m.pitchMove.toFixed(1)} st)?`);
      results.push({ syllable: entry.syllable, variant: variant.id, label: variant.label, ok: problems.length === 0, problems, seconds: sound, beats: m.beats, move: m.pitchMove, hz: m.pitchHz });
      console.log(`  ${entry.syllable}  ${variant.id}${problems.length ? "  (" + problems.join("; ") + ")" : ""}`);
    } catch (error) {
      failures += 1;
      console.error(`FAILED ${entry.syllable} ${variant.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
writeFileSync(join(outDir, "report.json"), JSON.stringify(results, null, 2));

const esc = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const rowHtml = list
  .map((entry) => {
    const mine = results.filter((r) => r.syllable === entry.syllable).sort((a, b) => Number(b.ok) - Number(a.ok));
    const tags = [
      entry.reported ? '<span class="t">tester said wrong</span>' : "",
      entry.stop ? '<span class="t g">stop sound: no puff, no "uh"</span>' : "",
      entry.english ? `<span class="t">not ${esc(entry.english)}</span>` : "",
    ].join("");
    const cards = mine
      .map(
        (r) => `<div class="v ${r.ok ? "" : "x"}"><b>${esc(r.label)}</b><audio controls preload="none" src="${entry.syllable}.${r.variant}.wav"></audio>
<div class="n">${r.seconds.toFixed(2)} s${r.problems.length ? "<br>" + esc(r.problems.join("; ")) : " - measurements fine"}</div>
<label><input type="radio" name="p-${entry.syllable}" value="${r.variant}"> piliin</label></div>`,
      )
      .join("");
    return `<section data-s="${entry.syllable}"><h3>${entry.syllable} <small>${esc(entry.ipa)} - Book ${entry.book}</small></h3><div>${tags}</div>${cards}
<div class="v none"><label><input type="radio" name="p-${entry.syllable}" value="record"> wala sa mga ito: ire-record ko</label></div></section>`;
  })
  .join("\n");

writeFileSync(
  join(outDir, "index.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Syllable picks</title>
<style>:root{color-scheme:light dark}body{font:15px system-ui;margin:16px;max-width:980px}section{border-top:1px solid #8885;padding:10px 0}h3{margin:0}small{font-weight:400;color:#888}
.v{display:inline-block;vertical-align:top;margin:6px 10px 6px 0;padding:8px;border:1px solid #8885;border-radius:8px;max-width:280px;font-size:13px}.v.x{opacity:.8}.n{color:#a60;margin:4px 0}
.t{display:inline-block;font-size:12px;background:#fe93;border-radius:99px;padding:1px 8px;margin:2px 4px 2px 0}.t.g{background:#4a82}#bar{position:sticky;top:0;background:Canvas;padding:8px 0;border-bottom:2px solid #888;z-index:3}</style>
<h1>Syllable picks (${esc(voice)})</h1>
<p>Pakinggan ang bawat bersyon. I-tick ang <b>piliin</b> sa may tamang bigkas at intonation (malinis ang patinig, walang dagdag na "uh", bahagyang bumababa sa dulo). Kung wala, piliin ang "ire-record ko". Hindi ito nakikinig para sa iyo: ang mga numero ay sukat lang.</p>
<div id="bar"><span id="count"></span> <button id="save">Download picks (syllable-picks.txt)</button></div>
${rowHtml}
<script>
const KEY="syllable-picks-${esc(voice)}";let data=JSON.parse(localStorage.getItem(KEY)||"{}");
const secs=[...document.querySelectorAll("section")];
function count(){document.getElementById("count").textContent=Object.keys(data).length+" of "+secs.length+" chosen   "}
document.querySelectorAll("input[type=radio]").forEach(r=>{const s=r.name.slice(2);r.checked=data[s]===r.value;r.onchange=()=>{data[s]=r.value;localStorage.setItem(KEY,JSON.stringify(data));count()}});
count();
document.getElementById("save").onclick=()=>{let t="";for(const s in data)t+=data[s]==="record"?"# "+s+" needs recording\\n":s+"="+data[s]+"\\n";
const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/plain"}));a.download="syllable-picks.txt";a.click()};
</script>`,
);
const clean = results.filter((r) => r.ok).length;
console.log(`\n${results.length} versions made, ${clean} pass the measurements. Open ${join(outDir, "index.html")} in Chrome and pick by ear.`);
process.exit(failures > 0 ? 1 : 0);
