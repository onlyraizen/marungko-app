import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";
import { font } from "../theme/fonts";
import { TRANSITIONS } from "./art/assets";

/** How long the launch animation runs (the splash pack's launch scene, cut to its first 1.9 s). */
const LENGTH_MS = 1900;

/** The opening screen: Capi surfaces from the pond and the name appears on the water. Calls `onDone` when it has played. */
export default function Splash({ onDone }: { onDone: () => void }) {
  const title = useRef(new Animated.Value(0)).current;
  const started = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;

  const start = () => {
    if (started.current) return;
    started.current = true;
    Animated.timing(title, { toValue: 1, duration: 420, delay: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    setTimeout(() => done.current(), LENGTH_MS);
  };

  // If the animation file is slow to load, show the name and carry on anyway.
  useEffect(() => {
    const timer = setTimeout(start, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <Image source={TRANSITIONS.launch} autoplay priority="high" contentFit="cover" style={StyleSheet.absoluteFill} onLoad={start} onError={start} />
      <Animated.Text
        style={[
          styles.title,
          { opacity: title, transform: [{ translateY: title.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
        ]}
      >
        Basa-Bata
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brown },
  // The water starts about 62% down the frame; the name sits on it.
  title: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "69%",
    textAlign: "center",
    fontFamily: font.display,
    fontSize: 54,
    lineHeight: 74,
    includeFontPadding: false,
    color: colors.surfaceHigh,
    textShadowColor: "rgba(20,104,143,0.55)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
});
