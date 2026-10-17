import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { font } from "../theme/fonts";
import { CapiFace } from "./art/Capi";

/** The opening screen: brown, Capi's face breathing, and the name. */
export default function Splash() {
  const pop = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(title, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pop, breath, title]);

  const scale = Animated.multiply(pop, breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }));

  return (
    <View style={styles.root}>
      <View style={styles.circle} />
      <Animated.View style={[styles.face, { transform: [{ scale }] }]}>
        <CapiFace size={250} />
      </Animated.View>
      <Animated.Text
        style={[
          styles.title,
          { opacity: title, transform: [{ translateY: title.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
        ]}
      >
        Basa-Bata
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brown, alignItems: "center", justifyContent: "center" },
  circle: { position: "absolute", width: 340, height: 340, borderRadius: 170, backgroundColor: colors.brownLight },
  face: { marginBottom: 60 },
  title: { position: "absolute", bottom: 90, fontFamily: font.display, fontSize: 58, color: colors.surface, letterSpacing: -0.5 },
});
