import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";

type Props = {
  /** True while the microphone is open. The button turns coral and pulses. */
  live: boolean;
  disabled?: boolean;
  onPress: () => void;
  label: string;
};

const BARS = [0.5, 0.9, 0.65, 1, 0.55];

/** The big microphone button: blue when ready, coral with pulse rings and moving bars while listening. */
export default function MicButton({ live, disabled = false, onPress, label }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const bars = useRef(BARS.map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (!live) {
      pulse.setValue(0);
      bars.forEach((bar) => bar.setValue(0.3));
      return;
    }
    const ring = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    const motion = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: BARS[i] ?? 1, duration: 260 + i * 60, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bar, { toValue: 0.25, duration: 260 + i * 60, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    );
    ring.start();
    motion.forEach((m) => m.start());
    return () => {
      ring.stop();
      motion.forEach((m) => m.stop());
    };
  }, [live, pulse, bars]);

  const ringStyle = (offset: number) => ({
    opacity: pulse.interpolate({ inputRange: [0, 0.01 + offset, 1], outputRange: [0, 0.45, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7 + offset] }) }],
  });

  const face = disabled ? colors.locked : live ? colors.danger : colors.info;
  const lip = disabled ? colors.lockedDark : live ? colors.dangerDark : colors.infoDark;

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        {live ? (
          <>
            <Animated.View pointerEvents="none" style={[styles.ring, ringStyle(0)]} />
            <Animated.View pointerEvents="none" style={[styles.ring, ringStyle(0.25)]} />
          </>
        ) : null}
        <Pressable
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: face, borderBottomColor: lip, borderBottomWidth: pressed ? 3 : 8, marginTop: pressed ? 5 : 0 },
          ]}
        >
          {live ? (
            <View style={styles.bars}>
              {bars.map((bar, i) => (
                <Animated.View key={i} style={[styles.bar, { transform: [{ scaleY: bar }] }]} />
              ))}
            </View>
          ) : (
            <MicIcon color={disabled ? colors.lockedInk : "#FFFFFF"} />
          )}
        </Pressable>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

/** A microphone drawn from plain shapes, so there is no icon font to load. */
function MicIcon({ color }: { color: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 22, height: 36, borderRadius: 11, backgroundColor: color }} />
      <View style={{ width: 36, height: 18, marginTop: -16, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderWidth: 4, borderTopWidth: 0, borderColor: color }} />
      <View style={{ width: 4, height: 8, backgroundColor: color }} />
      <View style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 10 },
  stage: { width: 104, height: 112, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 104, height: 104, borderRadius: 52, backgroundColor: colors.danger },
  button: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center" },
  bars: { flexDirection: "row", alignItems: "center", gap: 6, height: 50 },
  bar: { width: 8, height: 50, borderRadius: 4, backgroundColor: "#FFFFFF" },
  label: { fontFamily: "Nunito_800ExtraBold", fontSize: 14, letterSpacing: 1.4, color: colors.muted, textTransform: "uppercase" },
});
