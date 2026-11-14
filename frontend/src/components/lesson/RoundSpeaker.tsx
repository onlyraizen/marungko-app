import { Pressable, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { SpeakerIcon } from "../ui/Icons";

/** The round blue "listen again" button. Grey while Capi is listening or already speaking. */
export default function RoundSpeaker({ size = 54, disabled = false, onPress }: { size?: number; disabled?: boolean; onPress: () => void }) {
  const lip = Math.max(4, Math.round(size / 11));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Pakinggan"
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: disabled ? colors.locked : colors.info,
          borderBottomColor: disabled ? colors.lockedDark : colors.infoDark,
          borderBottomWidth: pressed ? 2 : lip,
        },
      ]}
    >
      <SpeakerIcon size={size * 0.52} color={disabled ? colors.lockedInk : "#12303F"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ base: { alignItems: "center", justifyContent: "center" } });
