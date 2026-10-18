import { Image } from "expo-image";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { ICONS } from "../art/assets";

/** "MABAGAL": the slow-voice switch. Blue text when off; a yellow turtle pill when Capi talks slowly. */
export default function SlowLink({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="Mabagal na boses"
      style={[styles.base, on && styles.on]}
    >
      {on ? <Image source={ICONS.turtle} contentFit="contain" style={styles.turtle} /> : null}
      <Text style={[styles.text, on && styles.textOn]}>{on ? "MABAGAL ✓" : "MABAGAL"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 36, paddingHorizontal: 10, borderRadius: 14, flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  on: { backgroundColor: colors.accent, borderColor: colors.accentDark },
  turtle: { width: 24, height: 24 },
  text: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.4, color: colors.infoInk },
  textOn: { color: colors.ink },
});
