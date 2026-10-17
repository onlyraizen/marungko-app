import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import CapybaraHead from "../art/CapybaraHead";
import FrogArt from "../art/FrogArt";

export type Mood = "happy" | "cheer" | "sad";
type Props = { mood?: Mood; size?: number; withFrog?: boolean; talking?: boolean };

/** Kapi the capybara, with his frog friend on his head. Used on sign-in and the child picker. */
export default function Mascot({ mood = "happy", size = 120, withFrog = true, talking = false }: Props) {
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

  const frogW = size * 0.3;
  return (
    <Animated.View
      accessibilityLabel="Si Kapi na capybara, at ang kaibigan niyang palaka"
      style={{ width: size, height: size * 0.87, transform: [{ translateY: bob }] }}
    >
      <View style={{ position: "absolute", left: 0, top: size * 0.11 }}>
        <CapybaraHead size={size} mood={mood} talking={talking} />
      </View>
      {withFrog ? (
        <View style={{ position: "absolute", left: size * 0.5 - frogW / 2, top: 0 }}>
          <FrogArt size={frogW} mood={mood === "sad" ? "sad" : "happy"} />
        </View>
      ) : null}
    </Animated.View>
  );
}
