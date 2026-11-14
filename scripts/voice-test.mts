import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * The 30-word voice test. Generates every word in a few styles, plus a second take of the plain style (to check
 * the same text sounds the same twice), and a rating page for a Filipino teacher.
 *
 *   pnpm voice:test                          dry run: shows what would be generated
 *   pnpm voice:test -- --yes                 generate into ~/voice-test, then open ~/voice-test/index.html
 *   pnpm voice:test -- --yes --voice Maya    try another voice (also: --cheerful adds a bright style)
 *
 * Pass/fail rule on the page: an item FAILS if stress, clarity or "uh" scores 2 or less. The voice FAILS for
 * phonics core if 10% or more of the items fail (3 of 30).
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
const voice = option("voice") ?? process.env.SONIOX_TTS_VOICE ?? "Maya";
const outDir = option("out-dir") ?? join(homedir(), "voice-test");

type Entry = { word: string; stress: string; class: string; focus: string };
const set = JSON.parse(readFileSync(join(root, "content", "voice-test-set.json"), "utf8")) as { words: Entry[] };

type Variant = { id: string; label: string; make: (entry: Entry) => string; speed?: number };
const split = (entry: Entry): string => entry.stress.toLowerCase().replace(/'/g, "").split("-").join("... ");
const variants: Variant[] = [
  { id: "plain", label: "plain", make: (e) => `${e.word}.` },
  { id: "plain2", label: "plain, second take", make: (e) => `${e.word}.` },
  { id: "split", label: "syllables then word", make: (e) => `${split(e)}. ${e.word}.` },
  { id: "slow", label: "speed 0.85", make: (e) => `${e.word}.`, speed: 0.85 },
  ...(flag("cheerful") ? [{ id: "cheer", label: "cheerful", make: (e: Entry) => `[happy] ${e.word}!` }] : []),
];

console.log(`Voice ${voice}, model ${MODEL}, language ${LANGUAGE}. ${set.words.length} words x ${variants.length} styles = ${set.words.length * variants.length} clips.`);
if (!flag("yes")) {
  console.log("Dry run: nothing generated. Add --yes to generate.");
  process.exit(0);
}
const apiKey = process.env.SONIOX_API_KEY?.trim();
if (!apiKey) throw new Error("SONIOX_API_KEY is not set. Run through pnpm so backend/.env is loaded.");

async function synthesize(text: string, speed?: number): Promise<Buffer> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(TTS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, language: LANGUAGE, voice, audio_format: "wav", sample_rate: 24000, text, ...(speed ? { speed } : {}) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      continue;
    }
    throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  throw new Error("unreachable");
}

mkdirSync(outDir, { recursive: true });
let failures = 0;
for (const entry of set.words) {
  for (const variant of variants) {
    const file = join(outDir, `${entry.word}.${variant.id}.wav`);
    if (existsSync(file)) continue;
    try {
      writeFileSync(file, await synthesize(variant.make(entry), variant.speed));
      console.log(`  ${entry.word}  ${variant.id}`);
    } catch (error) {
      failures += 1;
      console.error(`FAILED ${entry.word} ${variant.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

const criteria = [
  ["stress", "Diin"],
  ["clarity", "Linaw"],
  ["speed", "Bilis"],
  ["uh", "Walang 'uh'"],
  ["consistency", "Pare-pareho (plain vs second take)"],
  ["cheer", "Masigla"],
] as const;
const rows = set.words
  .map(
    (entry, index) => `<tr data-i="${index}"><td><b>${entry.word}</b><br><span class="s">${entry.stress}<br>${entry.class}</span><br><span class="f">${entry.focus}</span></td>
<td>${variants.map((v) => `<div class="v">${v.label}<br><audio controls preload="none" src="${entry.word}.${v.id}.wav"></audio><label><input type="radio" name="pick-${entry.word}" value="${v.id}"> piliin</label></div>`).join("")}</td>
<td>${criteria.map(([id, label]) => `<label>${label}<select data-w="${entry.word}" data-c="${id}"><option value=""></option>${[1, 2, 3, 4, 5].map((n) => `<option>${n}</option>`).join("")}</select></label>`).join("")}</td></tr>`,
  )
  .join("\n");

writeFileSync(
  join(outDir, "index.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Voice test</title>
<style>body{font:15px system-ui;margin:16px;max-width:1100px}table{border-collapse:collapse;width:100%}td{border-top:1px solid #ccc;padding:8px;vertical-align:top}
.s{color:#a00}.f{color:#666;font-size:12px}.v{display:inline-block;margin:0 8px 6px 0;font-size:12px}label{display:inline-block;margin:2px 8px 2px 0;font-size:12px}
#r{position:sticky;top:0;background:#fff;padding:8px;border-bottom:2px solid #333;font-weight:600}.bad{background:#fde}</style>
<h1>Voice test (${voice})</h1><p>Pakinggan ang bawat bersyon at i-tick ang <b>piliin</b> sa may tamang intonation at diin. Ang ratings (1 hanggang 5) ay optional. Sine-save ito sa browser na ito. Sa dulo, pindutin ang <b>Download picks</b>.</p>
<div id="r"></div><table>${rows}</table><p><button id="picks">Download picks (voice-picks.txt)</button> <button id="csv">Download ratings (CSV)</button></p>
<script>
const KEY="voice-test-${voice}";let data=JSON.parse(localStorage.getItem(KEY)||"{}");
const sels=[...document.querySelectorAll("select")];
sels.forEach(s=>{s.value=(data[s.dataset.w]||{})[s.dataset.c]||"";s.onchange=()=>{(data[s.dataset.w]=data[s.dataset.w]||{})[s.dataset.c]=s.value;localStorage.setItem(KEY,JSON.stringify(data));check()}});
document.querySelectorAll("input[type=radio]").forEach(r=>{const w=r.name.slice(5);r.checked=(data[w]||{}).pick===r.value;r.onchange=()=>{(data[w]=data[w]||{}).pick=r.value;localStorage.setItem(KEY,JSON.stringify(data))}});
document.getElementById("picks").onclick=()=>{let t="";for(const w in data)if(data[w].pick)t+=w+"="+data[w].pick+"\\n";
const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/plain"}));a.download="voice-picks.txt";a.click()};
function check(){let rated=0,fail=0;document.querySelectorAll("tr[data-i]").forEach(tr=>{const w=tr.querySelector("b").textContent,d=data[w]||{};
const core=["stress","clarity","uh"].map(c=>Number(d[c]||0));const done=core.every(Boolean);if(done)rated++;const bad=done&&core.some(n=>n<=2);if(bad)fail++;tr.classList.toggle("bad",bad)});
const limit=Math.ceil(document.querySelectorAll("tr[data-i]").length*0.1);
document.getElementById("r").textContent="Rated "+rated+" / "+document.querySelectorAll("tr[data-i]").length+"  |  failing items: "+fail+"  |  "+(fail>=limit?"VOICE FAILS for phonics core (limit "+limit+")":"within the limit ("+limit+")")}
check();
document.getElementById("csv").onclick=()=>{const cols=${JSON.stringify(criteria.map(([id]) => id))};let t="word,"+cols.join(",")+"\\n";for(const w in data)t+=w+","+cols.map(c=>data[w][c]||"").join(",")+"\\n";
const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/csv"}));a.download="voice-ratings.csv";a.click()};
</script>`,
);
console.log(`\nOpen ${join(outDir, "index.html")} in a browser.`);
process.exit(failures > 0 ? 1 : 0);
