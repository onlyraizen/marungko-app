import type { Unit } from "@marungko/shared";
import { UNIT_ICONS } from "../art/assets";

export type UnitState = "done" | "current" | "open" | "locked";

/** What sits on a capybara's label: the letters of a letter lesson, or a little picture. */
export type UnitIcon = { text: string } | { image: number };

/** The little tag on a capybara's label. */
export const iconFor = (unit: Unit): UnitIcon => {
  if (unit.kind === "letters") return { text: unit.title.split(" ")[0] ?? "A" };
  const image = UNIT_ICONS[unit.id];
  return image !== undefined ? { image } : { text: "★" };
};

export const starsFor = (best: number, total: number): number => {
  const ratio = total > 0 ? best / total : 0;
  return ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
};
