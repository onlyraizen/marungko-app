import type { Line } from "../../i18n";

/**
 * Everything Capi says besides the words children read, in Filipino and English. Each line is both shown on
 * screen and spoken. A line is only spoken if its recording exists (see content/phrases.json for the Filipino
 * lines and content/phrases-en.json for the English ones); until then the screen shows it and Capi stays quiet,
 * or says the Filipino line when only that one has a recording.
 *
 * Keep the two phrase files in step with this one: `pnpm content:phrases-check` lists anything missing.
 */

/** Said after a right answer, in turn. The first four were recorded first; the rest are the more excited ones. */
export const PRAISE: readonly Line[] = [
  { fil: "Tama!", en: "That's right!" },
  { fil: "Yehey! Tama ka!", en: "Yay! You got it!" },
  { fil: "Magaling!", en: "Great job!" },
  { fil: "Wow, ang husay mo!", en: "Wow, you're so good!" },
  { fil: "Husay!", en: "Awesome!" },
  { fil: "Tamang-tama!", en: "Perfect!" },
  { fil: "Ang galing mo!", en: "You're amazing!" },
  { fil: "Hooray! Ang galing!", en: "Hooray! Well done!" },
  { fil: "Napakahusay!", en: "Fantastic!" },
  { fil: "Sige pa! Ang galing mo!", en: "Keep going! You're doing great!" },
];

/** The n-th praise, skipping lines with no recording yet, so Capi is never silent after a right answer. */
export function praiseAt(n: number, has: (line: Line) => boolean): Line {
  const ready = PRAISE.filter(has);
  const pool = ready.length > 0 ? ready : PRAISE;
  return pool[n % pool.length] ?? { fil: "Tama!", en: "That's right!" };
}

export const FEEDBACK = {
  /** The right word said too fast: not a mistake, Capi asks to slow down and say it sound by sound. */
  slow: { fil: "Dahan-dahan lang tayo.", en: "Let's go slowly." } satisfies Line,
  slowThen: { fil: "Sabihin natin nang paisa-isang tunog.", en: "Let's say it one sound at a time." } satisfies Line,
  /** A single sound held too long ("moooo"): Capi says it short, then plays the short sound. */
  short: { fil: "Maikli lang ang tunog.", en: "Keep the sound short." } satisfies Line,
  almost: { fil: "Halos na!", en: "Almost!" } satisfies Line,
  again: { fil: "Subukan ulit.", en: "Try again." } satisfies Line,
  /** After three tries in a row nobody is kept stuck. */
  moveOn: { fil: "Okay lang! Tuloy tayo.", en: "That's okay! Let's keep going." } satisfies Line,
  xp: { fil: "Nakakuha ka ng XP!", en: "You earned XP!" } satisfies Line,
};

/** What Capi says at the end of a lesson, by how many answers were right. */
export function lessonLine(correct: number, total: number): Line {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio >= 1) return { fil: "Binabati kita! Tama lahat ng sagot mo!", en: "Congratulations! Every answer was right!" };
  if (ratio >= 0.7) return { fil: "Magaling! Halos tama lahat ng sagot mo!", en: "Great job! Almost every answer was right!" };
  if (ratio >= 0.4) {
    return { fil: "Magaling! May ilang mali pero okay lang. Natututo tayo sa pagkakamali.", en: "Great job! A few were wrong, but that's okay. We learn from mistakes." };
  }
  return { fil: "Magaling ang pagsisikap mo! Subukan natin ulit.", en: "You worked so hard! Let's try again." };
}

/** Every line above, for the phrase check (scripts/phrases-check.mts). */
export const ALL_LINES: readonly Line[] = [
  ...PRAISE,
  ...Object.values(FEEDBACK),
  lessonLine(1, 1),
  lessonLine(0.8, 1),
  lessonLine(0.5, 1),
  lessonLine(0, 1),
  { fil: "Magaling, tapos na ang aralin!", en: "Great job, lesson complete!" },
];
