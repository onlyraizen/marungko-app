import { manilaToday } from "./streak";

export type AttemptRow = {
  item: string;
  heard: string;
  kind: "correct" | "almost" | "incorrect";
  created_at: string;
};

export type WeekDay = { day: string; label: string; count: number };
export type HardItem = { item: string; tries: number; rate: number };
export type AttemptReport = {
  attempts: number;
  correct: number;
  /** 0 to 1, or null when there is nothing yet. */
  accuracy: number | null;
  /** The sounds and words that were missed most, worst first. */
  hardest: HardItem[];
  /** The last 7 days, oldest first. */
  week: WeekDay[];
  /** Rough minutes of practice in those 7 days. */
  minutesWeek: number;
};

const DAY_NAMES = ["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"];
const HOUR = 3600 * 1000;

/** The Manila calendar day (YYYY-MM-DD) of a timestamp. */
function dayOf(timestamp: string): string {
  return new Date(Date.parse(timestamp) + 8 * HOUR).toISOString().slice(0, 10);
}

function weekDays(today: string): WeekDay[] {
  const end = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(end - (6 - i) * 24 * HOUR);
    return { day: date.toISOString().slice(0, 10), label: DAY_NAMES[date.getUTCDay()] ?? "", count: 0 };
  });
}

/**
 * Turns the child's saved attempts into the numbers on the parent report.
 * Skips and notes (a "heard" in brackets) count as practice, but never as a mispronunciation.
 */
export function buildReport(rows: readonly AttemptRow[], today: string = manilaToday()): AttemptReport {
  const week = weekDays(today);
  const byDay = new Map(week.map((entry) => [entry.day, entry]));
  const perItem = new Map<string, { tries: number; right: number }>();
  let attempts = 0;
  let correct = 0;

  for (const row of rows) {
    const bucket = byDay.get(dayOf(row.created_at));
    if (bucket) bucket.count += 1;
    if (row.heard.startsWith("[")) continue;
    attempts += 1;
    if (row.kind === "correct") correct += 1;
    const entry = perItem.get(row.item) ?? { tries: 0, right: 0 };
    entry.tries += 1;
    if (row.kind === "correct") entry.right += 1;
    perItem.set(row.item, entry);
  }

  const hardest = [...perItem.entries()]
    .map(([item, { tries, right }]) => ({ item, tries, rate: right / tries }))
    .filter((entry) => entry.tries >= 2 && entry.rate < 0.7)
    .sort((a, b) => a.rate - b.rate || b.tries - a.tries)
    .slice(0, 5);

  // Minutes: add the gap between neighbouring attempts when it is short, and a little for each new start.
  const since = Date.parse(`${week[0]?.day ?? today}T00:00:00Z`) - 8 * HOUR;
  const times = rows
    .map((row) => Date.parse(row.created_at))
    .filter((time) => time >= since)
    .sort((a, b) => a - b);
  let seconds = 0;
  times.forEach((time, i) => {
    const gap = i === 0 ? Infinity : (time - (times[i - 1] ?? time)) / 1000;
    seconds += gap <= 120 ? gap : 20;
  });
  const minutesWeek = times.length === 0 ? 0 : Math.max(1, Math.round(seconds / 60));

  return { attempts, correct, accuracy: attempts === 0 ? null : correct / attempts, hardest, week, minutesWeek };
}

/** The plain-text report the parent can share. */
export function reportText(input: {
  name: string;
  lessons: number;
  totalLessons: number;
  streak: number;
  xp: number;
  report: AttemptReport;
}): string {
  const { name, lessons, totalLessons, streak, xp, report } = input;
  const lines = [
    `Ulat ng pag-unlad ni ${name} sa Basa-Bata`,
    `Natapos na aralin: ${lessons} sa ${totalLessons}`,
    `Araw na magkakasunod: ${streak}`,
    `Kabuuang XP: ${xp}`,
  ];
  if (report.accuracy !== null) lines.push(`Tamang sagot: ${Math.round(report.accuracy * 100)}% (${report.correct} sa ${report.attempts})`);
  lines.push(`Tinatayang oras ng pag-aaral ngayong linggo: ${report.minutesWeek} minuto`);
  if (report.hardest.length > 0) lines.push(`Dapat pang pagsanayan: ${report.hardest.map((entry) => entry.item).join(", ")}`);
  return lines.join("\n");
}
