import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { CapiFace } from "../art/Capi";
import { FlameIcon, GearIcon, YuzuIcon } from "./Icons";

type Props = { name: string; streak: number; yuzu: number; onProfile: () => void; onSettings: () => void };

function Pill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <View style={styles.pill} accessibilityLabel={`${label}: ${value}`}>
      {icon}
      <Text style={styles.pillValue}>{value}</Text>
    </View>
  );
}

/** The brown shelf along the top: the child, streak and yuzu, and the settings button. */
export default function TopBar({ name, streak, yuzu, onProfile, onSettings }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={onProfile} style={styles.who} accessibilityRole="button" accessibilityLabel="Profile">
        <View style={styles.avatar}>
          <CapiFace size={40} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </Pressable>
      <View style={styles.right}>
        <Pill icon={<FlameIcon size={20} />} value={streak} label="Araw na magkakasunod" />
        <Pill icon={<YuzuIcon size={20} />} value={yuzu} label="Yuzu" />
        <GearButton onPress={onSettings} />
      </View>
    </View>
  );
}

/** The round blue settings button. */
export function GearButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Mga Setting"
      style={({ pressed }) => [styles.gear, { borderBottomWidth: pressed ? 2 : 4 }]}
    >
      <GearIcon size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: colors.brown,
    borderBottomWidth: 5,
    borderBottomColor: "#4E2D13",
  },
  who: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brownLight,
    borderWidth: 2,
    borderColor: "#4E2D13",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  name: { fontFamily: font.display, fontSize: 20, lineHeight: 30, color: colors.surface, flexShrink: 1, includeFontPadding: false },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 10, height: 34 },
  pillValue: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  gear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.info,
    borderBottomColor: colors.infoDark,
    alignItems: "center",
    justifyContent: "center",
  },
});
