import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { SFX, type SfxName } from "../components/art/assets";

const players: Partial<Record<SfxName, AudioPlayer>> = {};

/**
 * A short sound effect (a chime for a right answer, a fanfare at the end of a lesson).
 * Fire and forget. It never plays while the microphone is open, and it never throws.
 */
export async function playSfx(name: SfxName, volume = 0.9): Promise<void> {
  try {
    // After the microphone the phone is in record mode, which plays quietly through the earpiece.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    let player = players[name];
    if (player === undefined) {
      player = createAudioPlayer(SFX[name]);
      players[name] = player;
    }
    player.volume = volume;
    await player.seekTo(0);
    player.play();
  } catch {
    // A missing chime is never worth interrupting a lesson.
  }
}
