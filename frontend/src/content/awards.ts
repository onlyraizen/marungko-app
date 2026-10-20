/** The Tagumpay medals and how each one is earned. Medals already earned are kept on the phone, so a streak that ends never takes one away. */
export type MedalKey =
  | "first" | "five" | "ten" | "perfect" | "s3" | "s7" | "xp100" | "xp500"
  | "book1" | "book2" | "book3" | "book4" | "book5" | "book6";

export type MedalInfo = { id: MedalKey; label: string; how: string };

export const MEDALS: readonly MedalInfo[] = [
  { id: "first", label: "Unang Aralin", how: "Tapusin ang unang aralin." },
  { id: "five", label: "5 Aralin", how: "Tapusin ang 5 aralin." },
  { id: "ten", label: "10 Aralin", how: "Tapusin ang 10 aralin." },
  { id: "perfect", label: "Perpekto", how: "Tama lahat ng sagot sa isang aralin." },
  { id: "s3", label: "3 Araw", how: "Mag-aral ng 3 araw na magkakasunod." },
  { id: "s7", label: "7 Araw", how: "Mag-aral ng 7 araw na magkakasunod." },
  { id: "xp100", label: "100 XP", how: "Makakuha ng 100 XP." },
  { id: "xp500", label: "500 XP", how: "Makakuha ng 500 XP." },
  { id: "book1", label: "Libro 1", how: "Tapusin ang Book 1." },
  { id: "book2", label: "Libro 2", how: "Tapusin ang Book 2." },
  { id: "book3", label: "Libro 3", how: "Tapusin ang Book 3." },
  { id: "book4", label: "Libro 4", how: "Tapusin ang Book 4." },
  { id: "book5", label: "Libro 5", how: "Tapusin ang Book 5." },
  { id: "book6", label: "Libro 6", how: "Tapusin ang Book 6." },
];

export const medalLabel = (id: string): string => MEDALS.find((medal) => medal.id === id)?.label ?? id;

export type AwardStats = {
  /** Lessons finished at least once. */
  lessons: number;
  /** Any lesson finished with every answer right. */
  perfect: boolean;
  streak: number;
  xp: number;
  /** Books finished, by number (1 to 6). */
  booksDone: readonly number[];
};

/** The medals these numbers earn. */
export function earnedMedals(stats: AwardStats): Set<MedalKey> {
  const got = new Set<MedalKey>();
  if (stats.lessons >= 1) got.add("first");
  if (stats.lessons >= 5) got.add("five");
  if (stats.lessons >= 10) got.add("ten");
  if (stats.perfect) got.add("perfect");
  if (stats.streak >= 3) got.add("s3");
  if (stats.streak >= 7) got.add("s7");
  if (stats.xp >= 100) got.add("xp100");
  if (stats.xp >= 500) got.add("xp500");
  for (const number of stats.booksDone) {
    const key = `book${number}` as MedalKey;
    if (MEDALS.some((medal) => medal.id === key)) got.add(key);
  }
  return got;
}
