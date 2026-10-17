import type { Unit } from "@marungko/shared";
import type { Peek } from "../art/assets";

export type BookStatus = "done" | "current" | "open" | "locked" | "soon";

/** The colours of one book cover, from the UI pack. */
export type BookLook = { face: string; lip: string; spine: string };

export type BookSection = { title: string | null; unitIds: string[] };

export type BookDef = {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  /** The lessons in this book, in order. A titled section gets a banner on the pond path. */
  sections: BookSection[];
  /** No lessons written yet: shown on the shelf as "Malapit na". */
  soon?: boolean;
  look: BookLook;
  /** Capi's reaction over this book, and what he says. Different for every book. */
  peek: Peek;
  say: string;
  /** The little tile on the cover. */
  badge: string;
};

const TEAL: BookLook = { face: "#1C8FA0", lip: "#136E7C", spine: "#167585" };
const RED: BookLook = { face: "#D9503A", lip: "#B23E2B", spine: "#B8402D" };
const AMBER: BookLook = { face: "#C48608", lip: "#9B6809", spine: "#A97407" };
const PURPLE: BookLook = { face: "#8E5BC0", lip: "#6F4796", spine: "#7B4DA8" };
const GREEN: BookLook = { face: "#5DA53F", lip: "#3D8F31", spine: "#4A9236" };
const BLUE: BookLook = { face: "#3F86D9", lip: "#3169A9", spine: "#3776C0" };
export const LOCKED_LOOK: BookLook = { face: "#7C8F99", lip: "#5E7079", spine: "#6A7D86" };

/**
 * The shelf. Book 1 keeps the letters and then the numbers, so finishing the letters carries on to
 * the numbers. Books 5 and 6 have no lessons yet. Edit this list to regroup the lessons.
 */
export const BOOKS: readonly BookDef[] = [
  {
    id: "book-1", number: 1, title: "Book 1", subtitle: "Mga Titik at Bilang",
    sections: [
      { title: "Mga Titik", unitIds: ["unit-01", "unit-02", "unit-03", "unit-04"] },
      { title: "Mga Bilang", unitIds: ["unit-05"] },
    ],
    look: TEAL, peek: "cheer", say: "Tara, magbasa!", badge: "Aa",
  },
  {
    id: "book-2", number: 2, title: "Book 2", subtitle: "Mga Salita 1",
    sections: [{ title: null, unitIds: ["theme-hayop", "theme-pamilya", "theme-katawan"] }],
    look: RED, peek: "curious", say: "Subukan natin!", badge: "ba",
  },
  {
    id: "book-3", number: 3, title: "Book 3", subtitle: "Mga Salita 2",
    sections: [{ title: null, unitIds: ["theme-pagkain", "theme-kulay", "theme-kalikasan"] }],
    look: AMBER, peek: "thinking", say: "Ano kaya ito?", badge: "ma",
  },
  {
    id: "book-4", number: 4, title: "Book 4", subtitle: "Mga Salita 3",
    sections: [{ title: null, unitIds: ["theme-magalang", "theme-bagay"] }],
    look: PURPLE, peek: "wink", say: "Kaya mo 'yan!", badge: "sa",
  },
  {
    id: "book-5", number: 5, title: "Book 5", subtitle: "Mga Pangungusap",
    sections: [], soon: true,
    look: GREEN, peek: "surprised", say: "Wow, mga pangungusap!", badge: "ka",
  },
  {
    id: "book-6", number: 6, title: "Book 6", subtitle: "Mga Kuwento",
    sections: [], soon: true,
    look: BLUE, peek: "proud", say: "Mga kuwento na!", badge: "★",
  },
];

export type BookView = BookDef & {
  /** The lessons, grouped the way the book groups them. */
  groups: { title: string | null; units: Unit[] }[];
  units: Unit[];
  doneUnits: number;
  totalUnits: number;
  status: BookStatus;
};

/** Works out each book's progress and whether it is open, from the lessons the child has finished. */
export function buildBookViews(units: readonly Unit[], isDone: (unitId: string) => boolean, unlockAll: boolean): BookView[] {
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const playable = (unit: Unit) => unit.syllables.length + unit.words.length > 0;
  const claimed = new Set(BOOKS.flatMap((def) => def.sections.flatMap((section) => section.unitIds)));
  // A lesson not listed in any book joins the last book that has lessons, so a new lesson is never lost.
  const spare = units.filter((unit) => playable(unit) && !claimed.has(unit.id));
  const lastLive = [...BOOKS].reverse().find((def) => !def.soon);

  const views: BookView[] = [];
  let previousDone = true;
  let currentTaken = false;
  for (const def of BOOKS) {
    const groups = def.sections
      .map((section) => ({
        title: section.title,
        units: section.unitIds.map((id) => byId.get(id)).filter((unit): unit is Unit => unit !== undefined && playable(unit)),
      }))
      .filter((group) => group.units.length > 0);
    if (def.id === lastLive?.id && spare.length > 0) groups.push({ title: null, units: spare });
    const own = groups.flatMap((group) => group.units);
    const doneUnits = own.filter((unit) => isDone(unit.id)).length;
    const finished = own.length > 0 && doneUnits === own.length;

    let status: BookStatus;
    if (def.soon || own.length === 0) status = "soon";
    else if (finished) status = "done";
    else if (!(unlockAll || previousDone)) status = "locked";
    else if (!currentTaken) status = "current";
    else status = "open";
    if (status === "current") currentTaken = true;
    if (status !== "soon") previousDone = previousDone && finished;
    views.push({ ...def, groups, units: own, doneUnits, totalUnits: own.length, status });
  }
  return views;
}
