import type { Unit } from "@marungko/shared";
import { buildPages, type BookPageData, type UnitState } from "./pages";

export type BookStatus = "done" | "current" | "open" | "locked";

export type BookDef = {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  /** Which pond pages (see buildPages) belong to this book, in order. */
  pageIds: string[];
};

/**
 * The shelf. Book 1 holds the letters page and then the numbers page, so finishing the letters
 * turns the page to the numbers, as the adviser asked. Edit this list to regroup the pages.
 */
export const BOOKS: readonly BookDef[] = [
  { id: "book-1", number: 1, title: "Book 1", subtitle: "Mga Titik at Bilang", pageIds: ["letters-1", "numbers-1"] },
  { id: "book-2", number: 2, title: "Book 2", subtitle: "Mga Salita 1", pageIds: ["theme-1"] },
  { id: "book-3", number: 3, title: "Book 3", subtitle: "Mga Salita 2", pageIds: ["theme-2"] },
];

export type BookView = BookDef & {
  pages: BookPageData[];
  doneUnits: number;
  totalUnits: number;
  status: BookStatus;
};

/** Works out each book's progress and whether it is open, from the lessons the child has finished. */
export function buildBookViews(
  units: readonly Unit[],
  isDone: (unitId: string) => boolean,
  unlockAll: boolean,
): BookView[] {
  const pages = buildPages(units);
  const claimed = new Set(BOOKS.flatMap((def) => def.pageIds));
  // Any page not listed above joins the last book, so a new unit is never lost.
  const spare = pages.filter((page) => !claimed.has(page.id));
  const views: BookView[] = [];
  let previousDone = true;
  let currentTaken = false;
  BOOKS.forEach((def, index) => {
    const own = pages.filter((page) => def.pageIds.includes(page.id));
    const mine = index === BOOKS.length - 1 ? [...own, ...spare] : own;
    const all = mine.flatMap((page) => page.units);
    const doneUnits = all.filter((unit) => isDone(unit.id)).length;
    const finished = all.length > 0 && doneUnits === all.length;
    const reachable = unlockAll || previousDone;
    const status: BookStatus = finished
      ? "done"
      : !reachable
        ? "locked"
        : !currentTaken
          ? "current"
          : "open";
    if (status === "current") currentTaken = true;
    views.push({ ...def, pages: mine, doneUnits, totalUnits: all.length, status });
    previousDone = previousDone && finished;
  });
  return views.filter((view) => view.totalUnits > 0);
}

export type { UnitState };
