import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { GearButton } from "../ui/TopBar";

/** The brown header used by the tab screens: a big title and the settings button. */
export default function ScreenHeader({ title, onSettings }: { title: string; onSettings?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {onSettings ? <GearButton onPress={onSettings} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: colors.brown,
    borderBottomWidth: 5,
    borderBottomColor: "#4E2D13",
  },
  title: { flex: 1, fontFamily: font.display, fontSize: 28, lineHeight: 40, color: colors.surface, includeFontPadding: false },
});
