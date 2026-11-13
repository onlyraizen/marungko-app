import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { UnitSchema, unitItems } from "../packages/shared/dist/index.js";
import { partsFor } from "../frontend/src/content/parts.ts";
import { QUIZ_QUESTIONS, buildTapQuiz, quizSize } from "../frontend/src/content/quiz.ts";
import { syllabify } from "../frontend/src/content/syllables.ts";
import { translate } from "../frontend/src/i18n/index.ts";
import { ALL_LINES, PRAISE, praiseAt } from "../frontend/src/components/lesson/lessonText.ts";

/**
 * Checks the lesson structure the adviser asked for: every lesson splits into parts by number of syllables, each part's
 * quiz only asks for items of that part, and the English and Filipino texts are complete. No phone needed.
 *
 *   pnpm lesson:test
 */
const root = join(import.meta.dirname, "..");
let failures = 0;
const fail = (message: string): void => {
  failures += 1;
  console.log(`FAIL  ${message}`);
};

const units = readdirSync(join(root, "content", "units"))
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => UnitSchema.parse(JSON.parse(readFileSync(join(root, "content", "units", name), "utf8"))));

const hasCardFile = (word: string): boolean => existsSync(join(root, "frontend", "assets", "art", "cards", `${word.toLowerCase().trim().replace(/\s+/g, "-")}.png`));
let choiceQuestions = 0;
let partsWithChoice = 0;
let parts = 0;
let questions = 0;
for (const unit of units) {
  const items = unitItems(unit).filter((item) => item.kind !== "sound").map((item) => item.text);
  const list = partsFor(items);
  parts += list.length;
  const seen = list.flatMap((part) => part.items);
  if (seen.length !== items.length || new Set(seen).size !== items.length) fail(`${unit.id}: parts do not hold every item exactly once`);
  if (list.some((part, i) => i > 0 && (list[i - 1]?.count ?? 0) >= part.count)) fail(`${unit.id}: parts are not in order of syllables`);
  for (const part of list) {
    for (const item of part.items) {
      const n = syllabify(item).length;
      const expected = Math.min(4, Math.max(1, n));
      if (expected !== part.count) fail(`${unit.id}: "${item}" has ${n} syllables but is in the ${part.count}-syllable part`);
    }
    const quiz = buildTapQuiz(part.items, QUIZ_QUESTIONS, hasCardFile);
    if (quiz.length !== quizSize(part.items)) fail(`${unit.id} ${part.id}: quiz has ${quiz.length} questions, quizSize says ${quizSize(part.items)}`);
    const kinds = quiz.map((question) => question.kind);
    if (kinds.includes("choice")) partsWithChoice += 1;
    if (kinds.some((kind, i) => kind === "choice" && kinds[i - 1] === "choice")) fail(`${unit.id} ${part.id}: two picture questions in a row`);
    if (kinds.length >= 3 && kinds.every((kind) => kind === kinds[0]) && quiz.some((q) => q.kind === "choice")) fail(`${unit.id} ${part.id}: one format only`);
    if (quiz.length > QUIZ_QUESTIONS) fail(`${unit.id} ${part.id}: more than ${QUIZ_QUESTIONS} questions`);
    for (const question of quiz) {
      questions += 1;
      if (question.kind === "choice") {
        choiceQuestions += 1;
        const wrong = question.choices.filter((c) => c !== question.word);
        if (question.choices.length !== 3 || new Set(question.choices).size !== 3 || wrong.length !== 2) fail(`${unit.id} ${part.id}: "${question.word}" needs 3 different choices, got ${question.choices.join("/")}`);
        if (!hasCardFile(question.word)) fail(`${unit.id} ${part.id}: picture question for "${question.word}" has no picture`);
        for (const c of wrong) {
          if (syllabify(c).length !== question.syllables.length) fail(`${unit.id} ${part.id}: wrong choice "${c}" has a different number of syllables than "${question.word}"`);
          if (c[0] === question.word[0]) fail(`${unit.id} ${part.id}: wrong choice "${c}" starts like "${question.word}"`);
        }
        continue;
      }
      if (!part.items.includes(question.word)) fail(`${unit.id} ${part.id}: asks "${question.word}", which this part does not teach`);
      if (part.count < 4 && question.syllables.length !== part.count) fail(`${unit.id} ${part.id}: "${question.word}" needs ${question.syllables.length} tiles in a ${part.count}-syllable part`);
      const labels = question.tiles.map((tile) => tile.label);
      // A tile may repeat only as often as the word itself repeats that syllable ("lolo" needs two "lo"); a look-alike never repeats.
      for (const label of new Set(labels)) {
        const inTiles = labels.filter((l) => l === label).length;
        const inWord = question.syllables.filter((s) => s === label).length;
        if (inTiles > Math.max(1, inWord)) fail(`${unit.id} ${part.id}: "${question.word}" has ${inTiles} tiles "${label}" but needs ${Math.max(1, inWord)}`);
      }
      for (const syllable of question.syllables) if (!labels.includes(syllable)) fail(`${unit.id} ${part.id}: "${question.word}" is missing the tile "${syllable}"`);
      if (part.count === 1 && question.tiles.length !== 4) fail(`${unit.id} ${part.id}: "${question.word}" should have 4 tiles to choose from`);
    }
  }
}
console.log(`${units.length} lessons -> ${parts} parts, ${questions} quiz questions built (random draws), all grouped by syllable count.`);
console.log(`Picture-to-word questions: ${choiceQuestions} in this draw, ${partsWithChoice} of ${parts} parts have one.`);

// Words and the English text: nothing is left as a placeholder, and praise never goes silent.
for (const key of ["partWord"] as const) {
  if (/\{\w+\}/.test(translate("en", key, { n: 1, total: 2 }))) fail(`translate: ${key} left a placeholder`);
}
for (const line of ALL_LINES) if (line.fil.trim() === "" || line.en.trim() === "") fail(`a line has an empty language: ${JSON.stringify(line)}`);
const first = praiseAt(0, () => false);
if (first.fil !== PRAISE[0]?.fil) fail("praise with no recordings should still pick a line");
const onlyOne = praiseAt(5, (line) => line.fil === "Tama!");
if (onlyOne.fil !== "Tama!") fail("praise should skip lines with no recording");
console.log(`${ALL_LINES.length} Capi lines in both languages; praise falls back to a recorded line.`);

console.log(failures === 0 ? "\nAll lesson checks pass." : `\n${failures} check(s) failed.`);
process.exit(failures > 0 ? 1 : 0);
