import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Builds docs/syllable-recorder.html: one page to record the syllables of Books 1 to 4 with a microphone.
 * Open the built file in Chrome (double-click it). Nothing is uploaded; the takes stay in the tab until you
 * download the zip.
 *
 *   pnpm content:build-recorder
 */

const root = join(import.meta.dirname, "..");
const template = readFileSync(join(root, "tools", "syllable-recorder.template.html"), "utf8");
const guide = JSON.parse(readFileSync(join(root, "content", "syllable-guide.json"), "utf8")) as unknown[];
// "<" is escaped so no text inside the data can close the script tag.
const data = JSON.stringify(guide).replace(/</g, "\\u003c");
if (!template.includes("/*DATA*/[]")) throw new Error("The template has no /*DATA*/[] marker.");
writeFileSync(join(root, "docs", "syllable-recorder.html"), template.replace("/*DATA*/[]", data));
console.log(`docs/syllable-recorder.html written with ${guide.length} syllables.`);
