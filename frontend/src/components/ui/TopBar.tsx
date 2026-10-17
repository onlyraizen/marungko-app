import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { book } from "../../theme/book";
import { colors, radius } from "../../theme/colors";
import CapybaraHead from "../art/CapybaraHead";

type Props = { name: string; streak: number; xp: number; onPress: () => void };

function Pill({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.pill} accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.pillIcon}>{icon}</Text>
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

/** A wooden shelf: the child on the left (opens the menu), streak and XP on the right. */
export default function TopBar({ name, streak, xp, onPress }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onPress} style={styles.who} accessibilityRole="button" accessibilityLabel="Menu">
        <View style={styles.avatar}>
          <CapybaraHead size={42} blink={false} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </Pressable>
      <View style={styles.pills}>
        <Pill icon="🔥" value={streak} label="Araw na magkakasunod" />
        <Pill icon="⭐" value={xp} label="XP" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: book.cover,
    borderBottomWidth: 4,
    borderBottomColor: book.coverDark,
  },
  who: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: book.coverDark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  name: { fontSize: 18, fontWeight: "800", color: book.paper, flexShrink: 1 },
  pills: { flexDirection: "row", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillIcon: { fontSize: 16 },
  pillValue: { fontSize: 16, fontWeight: "800", color: book.ink },
});
