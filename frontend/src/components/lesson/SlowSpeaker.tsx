import { Image } from "expo-image";
import { Pressable, StyleSheet } from "react-native";
import { useT } from "../../i18n";
import { colors } from "../../theme/colors";
import { ICONS } from "../art/assets";

/**
 * The turtle button beside the speaker (like Duolingo): one tap says the word again, slowly. It is not a setting;
 * the next word is spoken at the normal speed again.
 */
export default function SlowSpeaker({ size = 40, disabled = false, onPress }: { size?: number; disabled?: boolean; onPress: () => void }) {
  const t = useT();
  const lip = Math.max(3, Math.round(size / 11));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t("slowLabel")}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: disabled ? colors.locked : colors.accent,
          borderBottomColor: disabled ? colors.lockedDark : colors.accentDark,
          borderBottomWidth: pressed ? 2 : lip,
          opacity: disabled ? 0.8 : 1,
        },
      ]}
    >
      <Image source={ICONS.turtle} contentFit="contain" style={{ width: size * 0.66, height: size * 0.66 }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ base: { alignItems: "center", justifyContent: "center" } });
