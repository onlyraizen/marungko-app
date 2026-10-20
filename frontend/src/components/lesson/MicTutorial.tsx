import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { LOOPS } from "../art/assets";
import Button3D from "../ui/Button3D";

/** "Pindutin, magsalita, kusang titigil": a short animation shown the first time, and again from Settings. */
export default function MicTutorial({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 12) + 14, paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Paano magsalita kay Capi</Text>
        <Image source={LOOPS.micTutorial} autoplay contentFit="contain" style={styles.anim} accessibilityLabel="Pindutin ang mikropono, magsalita, at kusa itong titigil" />
        <View style={styles.steps}>
          <Text style={styles.step}>1. Pindutin ang mikropono nang isang beses.</Text>
          <Text style={styles.step}>2. Sabihin ang salita.</Text>
          <Text style={styles.step}>3. Kusa itong titigil. Walang ibang pipindutin!</Text>
        </View>
        <Button3D label="Sige!" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 90, backgroundColor: colors.bg },
  card: { flex: 1, paddingHorizontal: 22, alignItems: "stretch", justifyContent: "center", gap: 10 },
  title: { fontFamily: font.display, fontSize: 28, lineHeight: 40, color: colors.ink, textAlign: "center", includeFontPadding: false },
  anim: { alignSelf: "center", width: 300, height: 300 },
  steps: { gap: 4, marginBottom: 10 },
  step: { fontFamily: font.bold, fontSize: 17, lineHeight: 24, color: colors.ink },
});
