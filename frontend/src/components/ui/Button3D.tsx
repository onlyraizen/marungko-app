import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius } from "../../theme/colors";
import { font } from "../../theme/fonts";

export type Tone = "primary" | "info" | "danger" | "accent" | "neutral" | "locked";

const TONES: Record<Tone, { face: string; lip: string; text: string }> = {
  primary: { face: colors.primary, lip: colors.primaryDark, text: "#1D3B1A" },
  info: { face: colors.info, lip: colors.infoDark, text: "#12303F" },
  danger: { face: colors.danger, lip: colors.dangerDark, text: colors.white },
  accent: { face: colors.accent, lip: colors.accentDark, text: colors.ink },
  neutral: { face: colors.white, lip: colors.line, text: colors.text },
  locked: { face: colors.locked, lip: colors.lockedDark, text: colors.lockedInk },
};

type Props = {
  label: string;
  onPress?: () => void;
  tone?: Tone;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A chunky button with a darker "lip" underneath that squashes when pressed. */
export default function Button3D({ label, onPress, tone = "primary", disabled = false, small = false, style }: Props) {
  const t = TONES[disabled ? "locked" : tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        {
          backgroundColor: t.face,
          borderBottomColor: t.lip,
          borderBottomWidth: pressed && !disabled ? 2 : 6,
          marginTop: pressed && !disabled ? 4 : 0,
        },
        style,
      ]}
    >
      <Text style={[styles.label, small && styles.labelSmall, { color: t.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  small: { minHeight: 44, paddingHorizontal: 14 },
  label: { fontFamily: font.bold, fontSize: 17, letterSpacing: 1.4, textTransform: "uppercase" },
  labelSmall: { fontSize: 13, letterSpacing: 1 },
});
