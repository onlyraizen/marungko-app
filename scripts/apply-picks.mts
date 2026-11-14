import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Puts the versions you picked on the voice-test page into the app.
 *
 *   pnpm content:apply-picks -- --picks ~/Downloads/voice-picks.txt          dry run
 *   pnpm content:apply-picks -- --picks ~/Downloads/voice-picks.txt --yes    copy into the app
 *   add --from <folder> if the test clips are not in ~/voice-test
 *
 * voice-picks.txt has one line per word: saging=split. The picked clip replaces the app's clip for that word.
 * Afterwards run: pnpm content:normalize-audio
 */

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const option = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const picksPath = option("picks");
if (picksPath === undefined || !existsSync(picksPath)) throw new Error("Give the picks file: --picks <path to voice-picks.txt>");
const from = option("from") ?? join(homedir(), "voice-test");
const assetsDir = join(root, "frontend", "assets", "audio", "words");
const metaPath = join(root, "content", "audio-meta.json");

type Meta = Record<string, Record<string, unknown>>;
const meta: Meta = existsSync(metaPath) ? (JSON.parse(readFileSync(metaPath, "utf8")) as Meta) : {};
let copied = 0;
for (const line of readFileSync(picksPath, "utf8").split(/\r?\n/)) {
  const match = /^\s*([a-z0-9-]+)\s*=\s*([a-z0-9]+)\s*$/.exec(line);
  if (!match?.[1] || !match[2]) continue;
  const [, word, variant] = match;
  const source = join(from, `${word}.${variant}.wav`);
  if (!existsSync(source)) {
    console.warn(`MISSING ${source}`);
    continue;
  }
  console.log(`  ${word}: ${variant}`);
  if (args.includes("--yes")) {
    copyFileSync(source, join(assetsDir, `${word}.wav`));
    meta[word] = { ...(meta[word] ?? {}), variant, pickedAt: new Date().toISOString() };
  }
  copied += 1;
}
if (!args.includes("--yes")) {
  console.log(`\nDry run: ${copied} clip(s) would be replaced. Add --yes to apply.`);
} else {
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  console.log(`\nReplaced ${copied} clip(s). Next: pnpm content:normalize-audio`);
}
