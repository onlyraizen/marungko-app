import { Image } from "expo-image";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { TRANSITIONS } from "../art/assets";

/** pond: tide over the screen (child chosen) · book: the book opens and dives into its page · burst: lesson start. */
export type Scene = "pond" | "book" | "burst";

/**
 * Milliseconds from the first frame: `cover` is when the animation hides the whole screen (swap what is
 * underneath then), `end` is when it has faded away. Measured from the frames of each cut-down file.
 */
const TIMING: Record<Scene, { cover: number; end: number }> = {
  pond: { cover: 700, end: 1560 },
  book: { cover: 1200, end: 1520 },
  burst: { cover: 950, end: 1310 },
};

type Play = (scene: Scene, onCovered: () => void) => void;

const TransitionContext = createContext<Play>((_scene, onCovered) => onCovered());

/** Plays a short full-screen animation and runs `onCovered` while the screen is hidden. */
export function useTransition(): Play {
  return useContext(TransitionContext);
}

/** Draws the transitions over the whole app and blocks taps while one plays. Falls back to an instant swap. */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const enabled = useAppStore((state) => state.animations);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [active, setActive] = useState<{ scene: Scene; id: number } | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const started = useRef(false);
  const busy = useRef(false);
  const counter = useRef(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);

  const swap = useCallback(() => {
    const run = pending.current;
    pending.current = null;
    run?.();
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    swap();
    busy.current = false;
    setActive(null);
  }, [clearTimers, swap]);

  /** Starts the clock once the animation is on screen, so the swap lines up with what the child sees. */
  const start = useCallback(
    (scene: Scene) => {
      if (started.current) return;
      started.current = true;
      timers.current.push(setTimeout(swap, TIMING[scene].cover), setTimeout(finish, TIMING[scene].end));
    },
    [swap, finish],
  );

  const play = useCallback<Play>(
    (scene, onCovered) => {
      if (!enabled || reduceMotion || busy.current) {
        onCovered();
        return;
      }
      busy.current = true;
      started.current = false;
      pending.current = onCovered;
      counter.current += 1;
      setActive({ scene, id: counter.current });
      // If the file is slow to load, do not leave the child waiting: start the clock anyway.
      timers.current.push(setTimeout(() => start(scene), 1200));
    },
    [enabled, reduceMotion, start],
  );

  // Never lose the action if the app closes the host mid-way.
  useEffect(
    () => () => {
      clearTimers();
      swap();
    },
    [clearTimers, swap],
  );

  const value = useMemo(() => play, [play]);

  return (
    <TransitionContext.Provider value={value}>
      <View style={styles.fill}>
        {children}
        {active ? (
          <View key={active.id} style={styles.overlay}>
            <Image
              source={TRANSITIONS[active.scene]}
              autoplay
              priority="high"
              contentFit="cover"
              style={StyleSheet.absoluteFill}
              onLoad={() => start(active.scene)}
              onError={finish}
            />
          </View>
        ) : null}
      </View>
    </TransitionContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, elevation: 1000 },
});
