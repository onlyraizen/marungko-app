import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import { MicIcon } from "./Icons";

export type MicState = "ready" | "live" | "blocked";
type Props = {
  state: MicState;
  /** Dims the button while Capi is speaking. */
  waiting?: boolean;
  onPress: () => void;
  label: string;
};

const BARS = [16, 28, 40, 24, 14];
const LOOK = {
  ready: { face: colors.info, lip: colors.infoDark },
  live: { face: colors.danger, lip: colors.dangerDark },
  blocked: { face: colors.locked, lip: colors.lockedDark },
} as const;

/**
 * The big round microphone from the UI pack: blue and ready, coral with a pulsing ring and moving
 * bars while listening, grey with a slash when there is no microphone access.
 */
export default function MicButton({ state, waiting = false, onPress, label }: Props) {
  const ring = useRef(new Animated.Value(0)).current;
  const bars = useRef(BARS.map(() => new Animated.Value(0.35))).current;
  const live = state === "live";

  useEffect(() => {
    if (!live) {
      ring.setValue(0);
      bars.forEach((bar) => bar.setValue(0.35));
      return;
    }
    const pulse = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    const motion = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 1, duration: 300 + i * 70, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bar, { toValue: 0.3, duration: 300 + i * 70, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    );
    pulse.start();
    motion.forEach((m) => m.start());
    return () => {
      pulse.stop();
      motion.forEach((m) => m.stop());
    };
  }, [live, ring, bars]);

  const look = LOOK[state];
  return (
    <View style={styles.stage}>
      {live ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 84 / 52] }) }],
            },
          ]}
        />
      ) : null}
      <Pressable
        onPress={onPress}
        disabled={state === "blocked"}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: look.face,
            borderBottomColor: look.lip,
            borderBottomWidth: pressed ? 4 : 8,
            opacity: waiting && !live ? 0.55 : 1,
          },
        ]}
      >
        {live ? (
          <View style={styles.bars}>
            {bars.map((bar, i) => (
              <Animated.View key={i} style={[styles.bar, { height: BARS[i], transform: [{ scaleY: bar }] }]} />
            ))}
          </View>
        ) : (
          <MicIcon size={52} color={state === "blocked" ? colors.lockedInk : "#12303F"} slashed={state === "blocked"} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 104, height: 104, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 104, height: 104, borderRadius: 52, borderWidth: 4, borderColor: colors.info },
  button: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center" },
  bars: { flexDirection: "row", alignItems: "center", gap: 4, height: 44 },
  bar: { width: 7, borderRadius: 3.5, backgroundColor: "#FFFFFF" },
});
