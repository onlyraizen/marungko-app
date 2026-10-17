import type { Unit } from "@marungko/shared";

export type UnitState = "done" | "current" | "open" | "locked";

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

/** The little tag on a capybara's label: the letters, or a picture. */
export const iconFor = (unit: Unit): string =>
  unit.kind === "letters" ? (unit.title.split(" ")[0] ?? "A") : (ICONS[unit.id] ?? "★");

export const starsFor = (best: number, total: number): number => {
  const ratio = total > 0 ? best / total : 0;
  return ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
};
