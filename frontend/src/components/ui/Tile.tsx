import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";

export type TileState = "normal" | "picked" | "right" | "wrong";
type Props = {
  label: string;
  state?: TileState;
  /** "bank" tiles are the larger fixed-width ones that wait below the answer row. */
  size?: "answer" | "bank";
  onPress?: () => void;
  disabled?: boolean;
};

const LOOK: Record<TileState, { border: string; bg: string; ink: string }> = {
  normal: { border: colors.line, bg: "#FFFFFF", ink: colors.ink },
  picked: { border: colors.infoDark, bg: colors.infoBg, ink: colors.infoInk },
  right: { border: colors.primary, bg: colors.primaryBg, ink: colors.primaryInk },
  wrong: { border: colors.danger, bg: colors.dangerBg, ink: colors.dangerDark },
};

/** A syllable tile from the UI pack: white, with a thick lower edge. */
export default function Tile({ label, state = "normal", size = "answer", onPress, disabled = false }: Props) {
  const look = LOOK[state];
  const bank = size === "bank";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        bank ? styles.bank : styles.answer,
        { borderColor: look.border, backgroundColor: look.bg, borderBottomWidth: pressed ? 3 : 6, marginTop: pressed ? 3 : 0 },
      ]}
    >
      <Text style={[styles.text, { color: look.ink }]}>{label}</Text>
    </Pressable>
  );
}

/** The empty slot left behind when a tile moves up to the answer row. */
export function TileSlot() {
  return <View style={styles.slot} />;
}

const styles = StyleSheet.create({
  base: { borderWidth: 2, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  answer: { minWidth: 66, height: 58, paddingHorizontal: 16 },
  bank: { width: 84, height: 64 },
  text: { fontFamily: font.display, fontSize: 34, lineHeight: 52, includeFontPadding: false, textAlignVertical: "center" },
  slot: { width: 84, height: 64, borderRadius: 18, backgroundColor: "rgba(60,100,130,0.14)" },
});
