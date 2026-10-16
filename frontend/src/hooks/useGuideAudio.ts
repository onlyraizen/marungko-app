import { audioKey } from "@marungko/shared";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO } from "../audio/manifest";

/** Plays the pre-generated guide voice. Every file is bundled in the app; nothing is fetched. */
export function useGuideAudio() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [speaking, setSpeaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticket = useRef(0);

  const clearTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => {
    if (status.didJustFinish) {
      clearTimer();
      setSpeaking(false);
    }
  }, [status.didJustFinish]);

  useEffect(() => {
    if (status.error) {
      clearTimer();
      setSpeaking(false);
    }
  }, [status.error]);

  useEffect(() => clearTimer, []);

  const has = useCallback((text: string): boolean => AUDIO[audioKey(text)] !== undefined, []);

  /** Returns false when there is no recording for this text. */
  const say = useCallback(
    (text: string): boolean => {
      const source = AUDIO[audioKey(text)];
      if (source === undefined) return false;
      clearTimer();
      setSpeaking(true);
      const mine = (ticket.current += 1);
      void (async () => {
        try {
          // Plain playback mode: iPhones play louder than in record-and-play mode.
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        } catch {
          // Play anyway.
        }
        if (mine !== ticket.current) return; // stopped or replaced while switching modes
        player.volume = 1;
        player.replace(source);
        player.play();
      })();
      // Safety net: never leave the microphone button locked if a "finished" event is missed.
      timer.current = setTimeout(() => setSpeaking(false), 8000);
      return true;
    },
    [player],
  );

  const stop = useCallback(() => {
    ticket.current += 1;
    clearTimer();
    player.pause();
    setSpeaking(false);
  }, [player]);

  return { say, stop, has, speaking };
}
