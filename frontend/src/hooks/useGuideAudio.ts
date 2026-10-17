import { audioKey } from "@marungko/shared";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO } from "../audio/manifest";

/** How fast the guide talks in slow mode. 1 is the recorded speed. */
export const SLOW_RATE = 0.7;

/**
 * Plays the pre-generated guide voice. Every file is bundled in the app; nothing is fetched.
 * With `slow` on, every clip plays slower (pitch is kept), so a child can hear each sound.
 */
export function useGuideAudio(slow = false) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [speaking, setSpeaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticket = useRef(0);
  const queue = useRef<number[]>([]);
  const slowRef = useRef(slow);
  useEffect(() => {
    slowRef.current = slow;
  }, [slow]);

  const clearTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  /** Plays one clip. `mine` says which request this belongs to, so a stopped queue stays stopped. */
  const playClip = useCallback(
    async (source: number, mine: number) => {
      try {
        // Plain playback mode: iPhones play louder than in record-and-play mode.
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch {
        // Play anyway.
      }
      if (mine !== ticket.current) return; // stopped or replaced while switching modes
      player.volume = 1;
      player.replace(source);
      try {
        player.setPlaybackRate(slowRef.current ? SLOW_RATE : 1, "high");
      } catch {
        // Keep the normal speed if this phone refuses.
      }
      player.play();
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
    if (status.didJustFinish) playNext();
  }, [status.didJustFinish, playNext]);

  useEffect(() => {
    if (status.error) {
      queue.current = [];
      clearTimer();
      setSpeaking(false);
    }
  }, [status.error]);

  useEffect(() => clearTimer, []);

  const has = useCallback((text: string): boolean => AUDIO[audioKey(text)] !== undefined, []);

  /** Says each line in turn. Lines with no recording are skipped. Returns false if none can be said. */
  const sayAll = useCallback(
    (texts: readonly string[]): boolean => {
      const sources = texts.map((text) => AUDIO[audioKey(text)]).filter((source): source is number => source !== undefined);
      if (sources.length === 0) return false;
      ticket.current += 1;
      queue.current = sources;
      setSpeaking(true);
      playNext();
      return true;
    },
    [playNext],
  );

  const say = useCallback((text: string): boolean => sayAll([text]), [sayAll]);

  const stop = useCallback(() => {
    ticket.current += 1;
    queue.current = [];
    clearTimer();
    player.pause();
    setSpeaking(false);
  }, [player]);

  return { say, sayAll, stop, has, speaking };
}
