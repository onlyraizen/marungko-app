import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { ICONS, type IconName } from "../art/assets";

export type TabId = "libro" | "review" | "awards" | "profile" | "more";

const TABS: { id: TabId; icon: IconName; label: string }[] = [
  { id: "libro", icon: "libro", label: "Libro" },
  { id: "review", icon: "balikAral", label: "Balik-aral" },
  { id: "awards", icon: "tagumpay", label: "Mga Tagumpay" },
  { id: "profile", icon: "profile", label: "Profile" },
  { id: "more", icon: "higitPa", label: "Higit pa" },
];

type Props = { active: TabId; reviewCount: number; onSelect: (tab: TabId) => void };

/** The five-tab bar from the UI pack. The chosen tab gets a coloured box: blue, coral for review, purple for more. */
export default function TabBar({ active, reviewCount, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelect(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
            style={[styles.tab, on && (tab.id === "review" ? styles.onReview : tab.id === "more" ? styles.onMore : styles.on)]}
          >
            <Image source={ICONS[tab.icon]} contentFit="contain" style={styles.icon} />
            {tab.id === "review" && reviewCount > 0 ? (
              <View style={styles.dot}>
                <Text style={styles.dotText}>{reviewCount > 9 ? "9+" : reviewCount}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  tab: { width: 58, height: 56, borderRadius: 16, borderWidth: 2, borderColor: "transparent", alignItems: "center", justifyContent: "center" },
  on: { borderColor: colors.infoDark, backgroundColor: colors.infoBg },
  onReview: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  onMore: { borderColor: "#8E5BC0", backgroundColor: "#EFE4FA" },
  icon: { width: 38, height: 38 },
  dot: {
    position: "absolute",
    top: -4,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: { fontFamily: font.bold, fontSize: 11, color: "#FFFFFF" },
});
