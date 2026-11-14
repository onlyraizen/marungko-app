/** Today in the Philippines as YYYY-MM-DD (the server counts streak days in Asia/Manila too). */
export function manilaToday(now: number = Date.now()): string {
  return new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
}

/** Whole days from `from` to `to` (YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

type StreakFields = { streak_days: number; last_active_date: string | null };

/**
 * The streak the child really has right now. The server only updates it when a lesson is finished,
 * so a streak that was broken yesterday still reads as high until then; show 0 for it.
 */
export function effectiveStreak(child: StreakFields, today: string = manilaToday()): number {
  if (child.streak_days <= 0 || child.last_active_date === null) return 0;
  return daysBetween(child.last_active_date, today) >= 2 ? 0 : child.streak_days;
}

/** True when the child had a streak and missed a day, so Capi can say so once. */
export function streakWasLost(child: StreakFields, today: string = manilaToday()): boolean {
  return child.streak_days > 0 && child.last_active_date !== null && daysBetween(child.last_active_date, today) >= 2;
}
