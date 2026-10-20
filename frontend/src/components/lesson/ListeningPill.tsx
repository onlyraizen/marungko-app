import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";

/** "Nakikinig si Capi" with three dots that blink in turn. */
export default function ListeningPill() {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 360, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.delay((2 - i) * 200),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [dots]);
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>Nakikinig si Capi</Text>
      <View style={styles.dots}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
  },
  text: { fontFamily: font.bold, fontSize: 16, color: colors.infoInk },
  dots: { flexDirection: "row", gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.info },
});
