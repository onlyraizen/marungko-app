import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { ICONS, type IconName } from "../art/assets";

export type MoreChoice = "profile" | "review" | "awards" | "settings";
const ROWS: { id: MoreChoice; icon: IconName; label: string }[] = [
  { id: "profile", icon: "profile", label: "Profile" },
  { id: "review", icon: "balikAral", label: "Balik-aral" },
  { id: "awards", icon: "tagumpay", label: "Mga Tagumpay" },
  { id: "settings", icon: "settings", label: "Mga Setting" },
];

/** The "Higit pa" menu: a sheet that rises over the screen, just above the tab bar. */
export default function MoreSheet({ onChoose, onClose }: { onChoose: (choice: MoreChoice) => void; onClose: () => void }) {
  const rise = useRef(new Animated.Value(280)).current;
  useEffect(() => {
    Animated.spring(rise, { toValue: 0, useNativeDriver: true, bounciness: 5, speed: 16 }).start();
  }, [rise]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="Isara ang menu" />
      <Animated.View style={[styles.sheet, { transform: [{ translateY: rise }] }]}>
        <View style={styles.handle} />
        {ROWS.map((row, i) => (
          <Pressable
            key={row.id}
            onPress={() => onChoose(row.id)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: colors.infoBg }]}
          >
            <Image source={ICONS[row.icon]} contentFit="contain" style={styles.icon} />
            <Text style={styles.label}>{row.label}</Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { ...{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }, backgroundColor: "rgba(58,34,16,0.28)" } as const,
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 2,
    borderColor: colors.border,
  },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 24, height: 62 },
  rowLine: { borderTopWidth: 2, borderTopColor: "#F1E8D4" },
  icon: { width: 34, height: 34 },
  label: { fontFamily: font.display, fontSize: 22, lineHeight: 32, color: colors.ink, includeFontPadding: false },
});
