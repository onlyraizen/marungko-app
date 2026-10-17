import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";

/** "Pakinggan": plays the word again. Disabled while Capi is already speaking. */
export function SpeakerButton({ speaking, onPress }: { speaking: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={speaking}
      accessibilityRole="button"
      accessibilityLabel="Pakinggan"
      style={({ pressed }) => [styles.button, speaking && styles.busy, { borderBottomWidth: pressed ? 2 : 4, marginTop: pressed ? 2 : 6 }]}
    >
      <Text style={styles.icon}>🔊</Text>
      <Text style={styles.label}>{speaking ? "Nagsasalita..." : "Pakinggan"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.infoBg,
    borderColor: colors.infoDark,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 40,
  },
  busy: { opacity: 0.55 },
  icon: { fontSize: 18 },
  label: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1, color: colors.infoInk, textTransform: "uppercase" },
});
