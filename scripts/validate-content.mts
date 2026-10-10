import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { UnitSchema, type Unit } from "../packages/shared/dist/index.js";

const unitsDir = join(import.meta.dirname, "..", "content", "units");
const files = readdirSync(unitsDir).filter((name) => name.endsWith(".json")).sort();

let errors = 0;
let warnings = 0;
let drafts = 0;
const fail = (message: string): void => {
  errors += 1;
  console.error(`ERROR   ${message}`);
};
const warn = (message: string): void => {
  warnings += 1;
  console.warn(`WARNING ${message}`);
};

const seenIds = new Set<string>();
const taught = new Set<string>();

for (const file of files) {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(unitsDir, file), "utf8"));
  } catch {
    fail(`${file}: not valid JSON`);
    continue;
  }

  const parsed = UnitSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      fail(`${file}: ${issue.path.join(".")} ${issue.message}`);
    }
    continue;
  }
  const unit: Unit = parsed.data;

  if (seenIds.has(unit.id)) fail(`${file}: duplicate unit id "${unit.id}"`);
  seenIds.add(unit.id);
  if (unit.review === "draft") drafts += 1;

  const lists = [
    ["sounds", unit.sounds],
    ["syllables", unit.syllables],
    ["words", unit.words],
  ] as const;
  for (const [label, list] of lists) {
    const duplicates = list.filter((item, index) => list.indexOf(item) !== index);
    if (duplicates.length > 0) fail(`${file}: duplicate ${label}: ${[...new Set(duplicates)].join(", ")}`);
  }

  // Marungko rule: a child should only meet syllables and words made from letters already taught.
  if (unit.kind === "letters") {
    for (const letter of unit.letters) taught.add(letter.toLowerCase());
    for (const text of [...unit.syllables, ...unit.words]) {
      const missing = [...text.toLowerCase()].filter((char) => !taught.has(char));
      if (missing.length > 0) {
        warn(`${file}: "${text}" uses letters not taught yet: ${[...new Set(missing)].join(", ")}`);
      }
    }
    for (const sound of unit.sounds) {
      if (!unit.letters.includes(sound)) warn(`${file}: sound "${sound}" is not one of this unit's letters`);
    }
  }

  console.log(
    `${unit.id.padEnd(16)} ${unit.kind.padEnd(8)} sounds ${String(unit.sounds.length).padStart(2)}  ` +
      `syllables ${String(unit.syllables.length).padStart(2)}  words ${String(unit.words.length).padStart(2)}  [${unit.review}]`,
  );
}

console.log(`\n${files.length} unit files, ${errors} errors, ${warnings} warnings.`);
if (drafts > 0) {
  console.log(`${drafts} unit(s) are still "draft" (not yet reviewed by a teacher).`);
}
process.exit(errors > 0 ? 1 : 0);
