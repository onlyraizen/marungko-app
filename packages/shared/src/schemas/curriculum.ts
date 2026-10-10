import { z } from "zod";

/**
 * One lesson unit. Content files in /content/units are validated against this.
 * "review: draft" means a teacher has not yet checked the letters, words or order.
 */
export const UnitSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "use lowercase letters, digits and hyphens"),
  title: z.string().min(1),
  kind: z.enum(["letters", "numbers", "theme"]),
  review: z.enum(["draft", "teacher-reviewed"]),
  /** Letters first taught in this unit (kind "letters" only). */
  letters: z.array(z.string().min(1).max(2)).default([]),
  /** Isolated letter sounds, e.g. "m" read as "mmm". Not speech-scored. */
  sounds: z.array(z.string().min(1).max(2)).default([]),
  syllables: z.array(z.string().min(2).max(3)).default([]),
  words: z.array(z.string().min(2).max(24)).default([]),
});

export type Unit = z.output<typeof UnitSchema>;
export type ItemKind = "sound" | "syllable" | "word";

export interface LessonItem {
  id: string;
  unitId: string;
  kind: ItemKind;
  text: string;
}

/** Flattens a unit into the individual things a child practises, in teaching order. */
export function unitItems(unit: Unit): LessonItem[] {
  const make = (kind: ItemKind, texts: readonly string[]): LessonItem[] =>
    texts.map((text) => ({ id: `${unit.id}:${kind}:${text}`, unitId: unit.id, kind, text }));
  return [...make("sound", unit.sounds), ...make("syllable", unit.syllables), ...make("word", unit.words)];
}
