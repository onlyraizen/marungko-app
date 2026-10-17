import { Image } from "expo-image";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { ICONS } from "../art/assets";
import Button3D from "../ui/Button3D";
import { BoltIcon, FlameIcon, YuzuIcon } from "../ui/Icons";
import ScreenHeader from "./ScreenHeader";

type Props = {
  name: string;
  streak: number;
  yuzu: number;
  xp: number;
  lessonsDone: number;
  onSwitchChild: () => void;
  onSettings: () => void;
};

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statText} numberOfLines={1}>
        {value} <Text style={styles.statLabel}>{label}</Text>
      </Text>
    </View>
  );
}

/** The child's profile: avatar, name, and a summary of how they are doing. */
export default function ProfileScreen({ name, streak, yuzu, xp, lessonsDone, onSwitchChild, onSettings }: Props) {
  return (
    <View style={styles.root}>
      <ScreenHeader title={name} onSettings={onSettings} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.who}>
            <Image source={ICONS.profile} contentFit="contain" style={styles.avatar} />
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <Button3D label="Palitan ang mag-aaral" tone="info" small onPress={onSwitchChild} />
        </View>

        <Text style={styles.section}>BUOD</Text>
        <View style={styles.grid}>
          <Stat icon={<FlameIcon />} value={String(streak)} label="araw" />
          <Stat icon={<YuzuIcon size={28} />} value={String(yuzu)} label="yuzu" />
          <Stat icon={<Image source={ICONS.tagumpay} contentFit="contain" style={styles.medal} />} value={String(lessonsDone)} label="aralin" />
          <Stat icon={<BoltIcon />} value={String(xp)} label="XP" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  card: {
    gap: 14,
    padding: 16,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.border,
    borderRadius: 24,
  },
  avatar: { width: 100, height: 100 },
  who: { flexDirection: "row", alignItems: "center", gap: 16 },
  name: { flex: 1, fontFamily: font.display, fontSize: 28, lineHeight: 40, color: colors.ink, includeFontPadding: false },
  section: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.6, color: colors.muted, marginTop: 8, marginLeft: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: {
    width: "47.5%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 64,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    borderRadius: 18,
  },
  statText: { flexShrink: 1, fontFamily: font.display, fontSize: 22, lineHeight: 32, color: colors.ink, includeFontPadding: false },
  statLabel: { fontFamily: font.display, fontSize: 18 },
  medal: { width: 30, height: 30 },
});
