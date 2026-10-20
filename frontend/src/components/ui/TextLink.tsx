import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { font } from "../../theme/fonts";

/** The quiet text button under the main one: "DI MAKAPAGSALITA NGAYON". */
export default function TextLink({ label, onPress, color = "#6B5A47", style }: { label: string; onPress: () => void; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.link, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { height: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  text: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" },
});
