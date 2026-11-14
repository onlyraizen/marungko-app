import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { audioKey } from "../packages/shared/dist/index.js";
import { ALL_LINES } from "../frontend/src/components/lesson/lessonText.ts";

/**
 * Capi's lines live in frontend/src/components/lesson/lessonText.ts (Filipino and English together). Each must be in
 * content/phrases.json (Filipino) and content/phrases-en.json (English) so the audio script can record it, and each
 * recording must exist. This lists what is missing; it changes nothing.
 *
 *   pnpm content:phrases-check
 */
const root = join(import.meta.dirname, "..");
const dir = join(root, "frontend", "assets", "audio", "words");
const read = (name: string): string[] => (JSON.parse(readFileSync(join(root, "content", name), "utf8")) as { phrases: string[] }).phrases;
const fil = new Set(read("phrases.json"));
const en = new Set(read("phrases-en.json"));

let notListed = 0;
const needAudio: string[] = [];
for (const line of ALL_LINES) {
  if (!fil.has(line.fil)) {
    notListed += 1;
    console.log(`NOT IN phrases.json:    ${line.fil}`);
  } else if (!existsSync(join(dir, `${audioKey(line.fil)}.wav`))) needAudio.push(`Filipino: ${line.fil}`);
  if (!en.has(line.en)) {
    notListed += 1;
    console.log(`NOT IN phrases-en.json: ${line.en}`);
  } else if (!existsSync(join(dir, `en-${audioKey(line.en)}.wav`))) needAudio.push(`English:  ${line.en}`);
}
console.log(`\n${ALL_LINES.length} lines, ${ALL_LINES.length * 2 - needAudio.length - notListed} recordings present.`);
if (needAudio.length > 0) {
  console.log(`\nNo recording yet (Capi stays quiet for these, or says the Filipino one):\n  ${needAudio.join("\n  ")}`);
  console.log("\nMake them: pnpm content:audio -- --yes --syllables        (Filipino)\n           pnpm content:audio -- --english --yes --syllables   (English)");
}
process.exit(notListed > 0 ? 1 : 0);
