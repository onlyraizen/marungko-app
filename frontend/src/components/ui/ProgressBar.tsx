import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";

/** The lesson progress bar: white track, green fill that glides to its new length. */
export default function ProgressBar({ value }: { value: number }) {
  const fill = useRef(new Animated.Value(value)).current;
  useEffect(() => {
    Animated.timing(fill, { toValue: value, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value, fill]);
  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <Animated.View style={[styles.fill, { width }]}>
        <View style={styles.shine} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, height: 18, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.9)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 9, backgroundColor: colors.primary, minWidth: 18 },
  shine: { position: "absolute", left: 8, right: 8, top: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.45)" },
});
