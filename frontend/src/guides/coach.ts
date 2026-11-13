import { useCallback, useEffect, useRef } from "react";
import type { Line } from "../i18n";
import { COACH_LINE } from "../components/lesson/lessonText";
import { useAppStore } from "../store/useAppStore";

/**
 * First-time guides ("coach marks"): an arrow that shows a child where to tap the FIRST time they meet an element,
 * then never again for that element. Each id has a "seen" flag kept on the phone (per child; per device when no child
 * is chosen yet), so it survives restarting the app. A parent can reset them all in Settings.
 *
 *  lesson_intro         the first part intro ("Isang pantig"): the start button
 *  speaker_button       the first speaker (blue) button, in the first practice screen
 *  mic_button           the first microphone button
 *  quiz_syllable_build  the first build-the-word quiz: the syllable tiles
 *  quiz_picture_choice  the first picture-to-word quiz: the word choices
 */
export const GUIDE_IDS = ["lesson_intro", "speaker_button", "mic_button", "quiz_syllable_build", "quiz_picture_choice"] as const;
export type GuideId = (typeof GUIDE_IDS)[number];

const key = (child: string | null, id: GuideId) => `${child ?? "device"}:${id}`;

export type CoachVoice = {
  say: (line: Line) => void;
  stop: () => void;
  /** True while the guide voice is already speaking (a lesson word), so the prompt waits and is skipped. */
  busy: boolean;
};

/**
 * `order` lists the guides one screen can show, most important first. Only the first one not yet seen is current, so
 * two guides never show at the same time. `done(id)` retires a guide (the child tapped the element or "Sige").
 */
export function useCoach(order: readonly GuideId[], voice?: CoachVoice) {
  const child = useAppStore((state) => state.activeChildId);
  const seen = useAppStore((state) => state.seenGuides);
  const mark = useAppStore((state) => state.markGuideSeen);
  const current = order.find((id) => !seen[key(child, id)]) ?? null;

  // A short voice prompt, a moment after the guide appears. Skipped when the guide voice is busy; stopped on dismiss.
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  useEffect(() => {
    if (current === null) return;
    const timer = setTimeout(() => {
      const v = voiceRef.current;
      if (v && !v.busy) v.say(COACH_LINE);
    }, 1800);
    return () => clearTimeout(timer);
  }, [current]);

  const done = useCallback(
    (id: GuideId) => {
      mark(key(child, id));
      voiceRef.current?.stop();
    },
    [child, mark],
  );

  return { current, done };
}
