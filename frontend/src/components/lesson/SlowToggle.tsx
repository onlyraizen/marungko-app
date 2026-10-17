import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";

/** The turtle button: turns slow mode on and off for the guide voice. */
export default function SlowToggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="Mabagal na boses"
      style={({ pressed }) => [
        styles.pill,
        on ? styles.on : styles.off,
        { borderBottomWidth: pressed ? 2 : 4, marginTop: pressed ? 2 : 0 },
      ]}
    >
      <Text style={styles.icon}>🐢</Text>
      <Text style={[styles.label, on && styles.labelOn]}>{on ? "Mabagal" : "Normal"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 16, paddingHorizontal: 10, height: 40, borderWidth: 2 },
  off: { backgroundColor: colors.white, borderColor: colors.line },
  on: { backgroundColor: colors.accent, borderColor: colors.accentDark },
  icon: { fontSize: 18 },
  label: { fontFamily: font.bold, fontSize: 13, color: colors.muted },
  labelOn: { color: colors.ink },
});
