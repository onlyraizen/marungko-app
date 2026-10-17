import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

type RippleProps = { width: number; height: number; rings?: number; period?: number };

/** Rings that spread out across the water and fade away. */
export function Ripples({ width, height, rings = 2, period = 2400 }: RippleProps) {
  const values = useRef(Array.from({ length: rings }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const runs = values.map((value, i) =>
      Animated.sequence([
        Animated.delay((period / rings) * i),
        Animated.loop(
          Animated.timing(value, { toValue: 1, duration: period, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ),
      ]),
    );
    runs.forEach((run) => run.start());
    return () => runs.forEach((run) => run.stop());
  }, [values, period, rings]);

  return (
    <View pointerEvents="none" style={{ width, height }}>
      {values.map((value, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width,
            height,
            borderRadius: height / 2,
            borderWidth: 2,
            borderColor: "#FFFFFF",
            opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }),
            transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.5] }) }],
          }}
        />
      ))}
    </View>
  );
}

type BubbleProps = { width: number; height: number; count?: number };

/** Small bubbles that rise from under the water and pop. */
export function Bubbles({ width, height, count = 3 }: BubbleProps) {
  const values = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const runs = values.map((value, i) =>
      Animated.sequence([
        Animated.delay(i * 700),
        Animated.loop(Animated.timing(value, { toValue: 1, duration: 2100, easing: Easing.linear, useNativeDriver: true })),
      ]),
    );
    runs.forEach((run) => run.start());
    return () => runs.forEach((run) => run.stop());
  }, [values]);

  return (
    <View pointerEvents="none" style={{ width, height }}>
      {values.map((value, i) => {
        const dot = 6 + i * 2;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: width * (0.15 + 0.3 * i),
              bottom: 0,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              borderWidth: 1.5,
              borderColor: "#FFFFFF",
              backgroundColor: "rgba(255,255,255,0.35)",
              opacity: value.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] }),
              transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -height] }) }],
            }}
          />
        );
      })}
    </View>
  );
}
