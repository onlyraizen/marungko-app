import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { Capi } from "../art/Capi";
import type { Pose } from "../art/assets";

export type Mood = "happy" | "cheer" | "sad";
type Props = { mood?: Mood; size?: number };

const POSE: Record<Mood, Pose> = { happy: "wave", cheer: "cheer", sad: "thinking" };

/** Capi, bobbing gently. Used on sign-in and the child picker. */
export default function Mascot({ mood = "happy", size = 140 }: Props) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -size * 0.03, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, size]);

  return (
    <Animated.View style={{ transform: [{ translateY: bob }] }}>
      <Capi pose={POSE[mood]} size={size} />
    </Animated.View>
  );
}
