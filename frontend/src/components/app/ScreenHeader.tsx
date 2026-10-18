import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";

/** The brown header used by the tab screens: a big title. */
export default function ScreenHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    alignItems: "center",
    backgroundColor: colors.brown,
    borderBottomWidth: 5,
    borderBottomColor: "#4E2D13",
  },
  title: { fontFamily: font.display, fontSize: 28, lineHeight: 40, color: colors.surface, includeFontPadding: false },
});
