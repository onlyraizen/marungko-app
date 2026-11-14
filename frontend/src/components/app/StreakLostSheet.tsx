import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { playSfx } from "../../hooks/useSfx";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { FLAME, POSES } from "../art/assets";
import Button3D from "../ui/Button3D";

/** "Hindi nakapag-aral kahapon": shown once on a day the streak has ended. Gentle, and it says how to start again. */
export default function StreakLostSheet({ name, days, onClose }: { name: string; days: number; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const rise = useRef(new Animated.Value(460)).current;
  useEffect(() => {
    Animated.spring(rise, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }).start();
    void playSfx("streakLost", 0.8);
  }, [rise]);
  return (
    <View style={styles.fill}>
      <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="Isara" />
      <Animated.View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12, transform: [{ translateY: rise }] }]}>
        <View style={styles.hero}>
          <Image source={POSES.dayMissed} contentFit="contain" style={styles.capi} accessibilityLabel="Malungkot si Capi" />
          <Image source={FLAME.out} autoplay contentFit="contain" style={styles.flame} accessibilityLabel="Namatay ang apoy" />
        </View>
        <Text style={styles.title}>Hindi nakapag-aral kahapon</Text>
        <Text style={styles.text}>
          Natapos ang {days} araw na sunod-sunod ni {name}. Walang problema! Mag-aral ngayon para magsimula ulit ang apoy.
        </Text>
        <View style={styles.buttons}>
          <Button3D label="Sige, simulan natin!" onPress={onClose} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 80 },
  dim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(58,34,16,0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 2,
    borderColor: colors.border,
  },
  hero: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", height: 170 },
  capi: { width: 170, height: 170 },
  flame: { width: 84, height: 84, marginLeft: -6, marginBottom: 14 },
  title: { fontFamily: font.display, fontSize: 26, lineHeight: 38, color: colors.ink, textAlign: "center", includeFontPadding: false },
  text: { fontFamily: font.body, fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: "center", marginTop: 2, marginBottom: 14 },
  buttons: { alignSelf: "stretch" },
});
