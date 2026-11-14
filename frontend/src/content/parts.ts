import type { StringKey } from "../i18n";
import { syllabify } from "./syllables";

/**
 * A lesson is taught in parts by number of syllables, so a quiz never asks for something that was not taught in
 * that part: the one-syllable part has only one-syllable items (and its quiz only one-syllable answers), the
 * two-syllable part only two-syllable words, and so on. Words of four or more syllables (and phrases) share the last
 * part. Within a part the lesson's own teaching order is kept.
 */
export type LessonPart = {
  id: string;
  /** 1, 2, 3, or 4 meaning "four or more". */
  count: 1 | 2 | 3 | 4;
  title: StringKey;
  body: StringKey;
  items: string[];
};

const TITLE: Record<LessonPart["count"], StringKey> = { 1: "part1", 2: "part2", 3: "part3", 4: "part4" };
const BODY: Record<LessonPart["count"], StringKey> = { 1: "part1Body", 2: "part2Body", 3: "part3Body", 4: "part4Body" };

export function partCount(item: string): LessonPart["count"] {
  const n = syllabify(item).length;
  return n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : 4;
}

export function partsFor(items: readonly string[]): LessonPart[] {
  const buckets = new Map<LessonPart["count"], string[]>();
  for (const item of items) {
    const count = partCount(item);
    buckets.set(count, [...(buckets.get(count) ?? []), item]);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([count, list]) => ({ id: `p${count}`, count, title: TITLE[count], body: BODY[count], items: list }));
}
