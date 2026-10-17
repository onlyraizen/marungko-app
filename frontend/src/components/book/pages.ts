import type { Unit } from "@marungko/shared";

export type UnitState = "done" | "current" | "open" | "locked";
export type BookPageData = { id: string; title: string; units: Unit[] };

const PER_PAGE = 4;

const ICONS: Record<string, string> = {
  "unit-05": "🔢",
  "theme-hayop": "🐶",
  "theme-pamilya": "👪",
  "theme-katawan": "🖐️",
  "theme-pagkain": "🍌",
  "theme-kulay": "🎨",
  "theme-kalikasan": "🌳",
  "theme-magalang": "🙏",
  "theme-bagay": "📦",
};

/** The little tag on a frog's lily pad: the letters, or a picture. */
export const iconFor = (unit: Unit): string =>
  unit.kind === "letters" ? (unit.title.split(" ")[0] ?? "A") : (ICONS[unit.id] ?? "★");

export const starsFor = (best: number, total: number): number => {
  const ratio = total > 0 ? best / total : 0;
  return ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
};

/** Groups the lessons into book pages, at most four frogs per page. */
export function buildPages(units: readonly Unit[]): BookPageData[] {
  const playable = units.filter((unit) => unit.syllables.length + unit.words.length > 0);
  const pages: BookPageData[] = [];
  const kinds: Unit["kind"][] = ["letters", "numbers", "theme"];
  for (const kind of kinds) {
    const group = playable.filter((unit) => unit.kind === kind);
    const base = kind === "letters" ? "Mga Titik" : kind === "numbers" ? "Mga Bilang" : "Mga Salita";
    const count = Math.ceil(group.length / PER_PAGE);
    for (let i = 0; i < group.length; i += PER_PAGE) {
      const number = i / PER_PAGE + 1;
      pages.push({
        id: `${kind}-${number}`,
        title: count > 1 ? `${base} ${number}` : base,
        units: group.slice(i, i + PER_PAGE),
      });
    }
  }
  return pages;
}
