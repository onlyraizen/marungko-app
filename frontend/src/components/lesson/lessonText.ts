import type { MatchResult } from "@marungko/shared";

/** The praise Capi says after a right answer. Every line has a recording. */
export const PRAISE = ["Tama!", "Magaling!", "Husay!", "Ang galing mo!"] as const;

export const FEEDBACK: Record<MatchResult["kind"], { title: string; voice: string }> = {
  correct: { title: "Tama!", voice: "Tama!" },
  almost: { title: "Halos na!", voice: "Halos na!" },
  incorrect: { title: "Subukan ulit", voice: "Subukan ulit." },
};

/** What Capi says at the end of a lesson, by how many answers were right. Every line has a recording. */
export function lessonMessage(correct: number, total: number): string {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio >= 1) return "Binabati kita! Tama lahat ng sagot mo!";
  if (ratio >= 0.7) return "Magaling! Halos tama lahat ng sagot mo!";
  if (ratio >= 0.4) return "Magaling! May ilang mali pero okay lang. Natututo tayo sa pagkakamali.";
  return "Magaling ang pagsisikap mo! Subukan natin ulit.";
}
