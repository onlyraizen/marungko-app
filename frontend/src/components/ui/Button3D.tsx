import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius } from "../../theme/colors";

export type Tone = "primary" | "info" | "danger" | "accent" | "neutral" | "locked";

const TONES: Record<Tone, { face: string; lip: string; text: string }> = {
  primary: { face: colors.primary, lip: colors.primaryDark, text: colors.white },
  info: { face: colors.info, lip: colors.infoDark, text: colors.ink },
  danger: { face: colors.danger, lip: colors.dangerDark, text: colors.white },
  accent: { face: colors.accent, lip: colors.accentDark, text: colors.ink },
  neutral: { face: colors.surface, lip: colors.border, text: colors.text },
  locked: { face: colors.locked, lip: colors.lockedDark, text: colors.muted },
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
          borderBottomWidth: pressed && !disabled ? 1 : 5,
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
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  small: { paddingVertical: 10, paddingHorizontal: 14 },
  label: { fontSize: 16, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  labelSmall: { fontSize: 13 },
});
