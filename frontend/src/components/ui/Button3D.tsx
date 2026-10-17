import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius } from "../../theme/colors";
import { font } from "../../theme/fonts";

export type Tone = "primary" | "info" | "danger" | "accent" | "neutral" | "locked" | "outline" | "outlineDanger" | "outlineLight";

const TONES: Record<Tone, { face: string; lip: string; text: string; outline?: boolean }> = {
  primary: { face: colors.primary, lip: colors.primaryDark, text: "#1D3B1A" },
  info: { face: colors.info, lip: colors.infoDark, text: "#12303F" },
  danger: { face: colors.danger, lip: colors.dangerDark, text: colors.white },
  accent: { face: colors.accent, lip: colors.accentDark, text: colors.ink },
  neutral: { face: colors.white, lip: colors.line, text: colors.text },
  locked: { face: colors.locked, lip: colors.lockedDark, text: colors.lockedInk },
  outline: { face: "transparent", lip: "#2E8B45", text: colors.primaryInk, outline: true },
  outlineDanger: { face: "transparent", lip: colors.danger, text: colors.dangerDark, outline: true },
  // For the dark account screens.
  outlineLight: { face: "transparent", lip: "#5A3F2A", text: "#FFF3D6", outline: true },
};

type Props = {
  label: string;
  onPress?: () => void;
  tone?: Tone;
  disabled?: boolean;
  small?: boolean;
  /** Overrides the label colour (the dark screens use green text on an outline). */
  labelColor?: string;
  style?: StyleProp<ViewStyle>;
};

/** The chunky UI-pack button: a darker "lip" underneath that squashes when pressed. */
export default function Button3D({ label, onPress, tone = "primary", disabled = false, small = false, labelColor, style }: Props) {
  const t = TONES[disabled && !TONES[tone].outline ? "locked" : tone];
  const outline = t.outline === true;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        outline && styles.outline,
        small && styles.small,
        {
          backgroundColor: t.face,
          borderColor: t.lip,
          borderBottomColor: t.lip,
          borderBottomWidth: pressed && !disabled ? (outline ? 3 : 2) : outline ? 5 : 6,
          marginTop: pressed && !disabled ? (outline ? 2 : 4) : 0,
          opacity: disabled && outline ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, outline && styles.labelOutline, small && styles.labelSmall, { color: labelColor ?? t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 60, borderRadius: radius.md, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  outline: { minHeight: 52, borderWidth: 3, borderRadius: 16 },
  small: { minHeight: 44, paddingHorizontal: 14 },
  label: { fontFamily: font.bold, fontSize: 18, letterSpacing: 1.4, textTransform: "uppercase", textAlign: "center" },
  labelOutline: { fontSize: 15 },
  labelSmall: { fontSize: 13, letterSpacing: 1 },
});
