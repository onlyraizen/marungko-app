import type { ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { CloseIcon, YuzuIcon } from "../ui/Icons";
import ProgressBar from "../ui/ProgressBar";

type Props = {
  /** The heading under the bar, e.g. "Ulitin pagkatapos ni Capi". */
  title: string;
  progress: number;
  combo: number;
  yuzu: number;
  onClose: () => void;
  children: ReactNode;
};

/** Every exercise screen: close button, combo and progress bar, yuzu count, then the heading. */
export default function ExerciseFrame({ title, progress, combo, yuzu, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  const confirmClose = () =>
    Alert.alert("Aalis ka na ba?", "Hindi mase-save ang progreso ng araling ito.", [
      { text: "Magpatuloy", style: "cancel" },
      { text: "Umalis", style: "destructive", onPress: onClose },
    ]);
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={confirmClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Isara ang aralin">
          <CloseIcon />
        </Pressable>
        <View style={styles.middle}>
          <Text style={[styles.combo, { color: combo > 0 ? colors.primaryInk : "#8A7B66" }]}>KOMBO x{combo}</Text>
          <View style={styles.bar}>
            <ProgressBar value={progress} />
          </View>
        </View>
        <View style={styles.yuzu}>
          <YuzuIcon />
          <Text style={styles.yuzuText}>{yuzu}</Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 8, paddingRight: 16 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  middle: { flex: 1, alignItems: "center", gap: 4 },
  bar: { alignSelf: "stretch", flexDirection: "row" },
  combo: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.3 },
  yuzu: { flexDirection: "row", alignItems: "center", gap: 6 },
  yuzuText: { fontFamily: font.display, fontSize: 22, lineHeight: 32, color: colors.ink, includeFontPadding: false },
  title: { fontFamily: font.display, fontSize: 28, lineHeight: 40, color: colors.ink, paddingHorizontal: 20, marginTop: 14 },
});
