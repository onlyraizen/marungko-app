import { audioKey } from "@marungko/shared";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO } from "../audio/manifest";
import type { Line } from "../i18n";
import { useAppStore } from "../store/useAppStore";

/** What can be said: a word or sound children read (always Tagalog), or one of Capi's own lines (Filipino or English). */
export type Sayable = string | Line;

/** English recordings are saved as "en-<name>" so they can never clash with a Tagalog word. */
export const ENGLISH_PREFIX = "en-";

/** How fast the guide talks in slow mode. 1 is the recorded speed. */
export const SLOW_RATE = 0.7;

/** How long a playback mode switch stays valid. Switching again right away only delays the first sound. */
const MODE_FRESH_MS = 2500;
/** If a clip has not started this long after play(), press play once more (what a second tap used to do). */
const NUDGE_MS = 380;
/** The longest to wait for a clip to load before playing anyway. */
const LOAD_WAIT_MS = 700;
let modeSetAt = 0;

/** Call when the microphone opens: it changes the phone's audio mode, so the next clip must set playback mode again. */
export function invalidatePlaybackMode(): void {
  modeSetAt = 0;
}

/**
 * Plays the pre-generated guide voice. Every file is bundled in the app; nothing is fetched.
 * `{ slow: true }` plays that request slower (pitch is kept), so a child can hear each sound: it is the "Mabagal"
 * button in the lesson, one tap for one replay, not a setting that stays on.
 */
export function useGuideAudio() {
  const language = useAppStore((state) => state.language);
  // 100 ms status updates: the default 500 ms made the end of every clip, and so the mic, up to half a second late.
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [speaking, setSpeaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticket = useRef(0);
  const queue = useRef<number[]>([]);
  const slowRef = useRef(false);
  const clipSeq = useRef(0);

  const clearTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  /** Plays one clip. `mine` says which request this belongs to, so a stopped queue stays stopped. */
  const playClip = useCallback(
    async (source: number, mine: number) => {
      clipSeq.current += 1;
      const id = clipSeq.current;
      if (Date.now() - modeSetAt > MODE_FRESH_MS) {
        try {
          // Plain playback mode: iPhones play louder than in record-and-play mode.
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
          modeSetAt = Date.now();
        } catch {
          // Play anyway.
        }
      }
      if (mine !== ticket.current) return; // stopped or replaced while switching modes
      player.volume = 1;
      player.replace(source);
      try {
        player.setPlaybackRate(slowRef.current ? SLOW_RATE : 1, "high");
      } catch {
        // Keep the normal speed if this phone refuses.
      }
      // Wait for the file to be ready: playing a clip that is still loading was one cause of "nothing on the first tap".
      const waitUntil = Date.now() + LOAD_WAIT_MS;
      while (!player.isLoaded && Date.now() < waitUntil) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        if (mine !== ticket.current) return;
      }
      player.play();
      setTimeout(() => {
        if (mine !== ticket.current || id !== clipSeq.current || player.playing) return;
        if (__DEV__) console.warn("[guide] clip had not started; pressing play again");
        player.play();
      }, NUDGE_MS);
    },
    [player],
  );

  const armSafetyTimer = () => {
    clearTimer();
    // Never leave the microphone button locked if a "finished" event is missed.
    timer.current = setTimeout(() => {
      queue.current = [];
      setSpeaking(false);
    }, slowRef.current ? 12000 : 8000);
  };

  const playNext = useCallback(() => {
    const next = queue.current.shift();
    if (next === undefined) {
      clearTimer();
      setSpeaking(false);
      return;
    }
    armSafetyTimer();
    void playClip(next, ticket.current);
  }, [playClip]);

  useEffect(() => {
    if (status.didJustFinish) {
      clipSeq.current += 1; // the clip is over: cancel its "press play again" check
      playNext();
    }
  }, [status.didJustFinish, playNext]);

  useEffect(() => {
    if (status.error) {
      queue.current = [];
      clearTimer();
      setSpeaking(false);
    }
  }, [status.error]);

  useEffect(() => clearTimer, []);

  /** The recording for a word or one of Capi's lines. A line in English falls back to its Filipino recording. */
  const sourceOf = useCallback(
    (what: Sayable): number | undefined => {
      if (typeof what === "string") return AUDIO[audioKey(what)];
      if (language === "en") {
        const english = AUDIO[`${ENGLISH_PREFIX}${audioKey(what.en)}`];
        if (english !== undefined) return english;
      }
      return AUDIO[audioKey(what.fil)];
    },
    [language],
  );

  const has = useCallback((what: Sayable): boolean => sourceOf(what) !== undefined, [sourceOf]);

  /** Says each item in turn. Items with no recording are skipped. Returns false if none can be said. */
  const sayAll = useCallback(
    (items: readonly Sayable[], options?: { slow?: boolean }): boolean => {
      const sources = items.map(sourceOf).filter((source): source is number => source !== undefined);
      if (sources.length === 0) return false;
      slowRef.current = options?.slow === true;
      ticket.current += 1;
      queue.current = sources;
      setSpeaking(true);
      playNext();
      return true;
    },
    [playNext, sourceOf],
  );

  const say = useCallback((what: Sayable, options?: { slow?: boolean }): boolean => sayAll([what], options), [sayAll]);

  const stop = useCallback(() => {
    ticket.current += 1;
    queue.current = [];
    clearTimer();
    player.pause();
    setSpeaking(false);
  }, [player]);

  return { say, sayAll, stop, has, speaking };
}
