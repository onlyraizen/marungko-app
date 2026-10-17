import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import ProgressBar from "../ui/ProgressBar";
import SlowToggle from "./SlowToggle";

type Props = { progress: number; slow: boolean; onToggleSlow: () => void; onClose: () => void };

/** Close button, progress bar and the slow-voice switch. */
export default function LessonHeader({ progress, slow, onToggleSlow, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const confirmClose = () =>
    Alert.alert("Aalis ka na ba?", "Hindi mase-save ang progreso ng araling ito.", [
      { text: "Magpatuloy", style: "cancel" },
      { text: "Umalis", style: "destructive", onPress: onClose },
    ]);
  return (
    <View style={[styles.row, { paddingTop: insets.top + 10 }]}>
      <Pressable onPress={confirmClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Isara ang aralin">
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
      <ProgressBar value={progress} />
      <SlowToggle on={slow} onPress={onToggleSlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 6 },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  closeText: { fontFamily: font.display, fontSize: 24, color: colors.muted },
});
