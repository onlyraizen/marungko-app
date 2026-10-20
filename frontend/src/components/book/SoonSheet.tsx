import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { SCENES } from "../art/assets";
import Button3D from "../ui/Button3D";
import type { BookView } from "./books";

/** "Malapit na": a peek at the scene of a book whose lessons are still being written. */
export default function SoonSheet({ book, onClose }: { book: BookView; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const scene = (SCENES as Record<number, number>)[book.number];
  return (
    <View style={styles.fill}>
      <Pressable style={styles.dim} onPress={onClose} accessibilityLabel="Isara" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        {scene !== undefined ? <Image source={scene} contentFit="cover" style={styles.scene} accessibilityLabel={`Larawan ng ${book.title}`} /> : null}
        <Text style={styles.kicker}>MALAPIT NA</Text>
        <Text style={styles.title}>
          {book.title}: {book.subtitle}
        </Text>
        <Text style={styles.text}>Isinusulat pa namin ang mga aralin dito. Tapusin muna ang mga nauna, at abangan!</Text>
        <View style={styles.button}>
          <Button3D label="Sige" onPress={onClose} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 80 },
  dim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(58,34,16,0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 2,
    borderColor: colors.border,
    gap: 4,
  },
  scene: { alignSelf: "stretch", aspectRatio: 4 / 3, borderRadius: 20, borderWidth: 2, borderColor: colors.border, marginBottom: 8 },
  kicker: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.6, color: colors.muted },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 34, color: colors.ink, textAlign: "center", includeFontPadding: false },
  text: { fontFamily: font.body, fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: "center", marginBottom: 10 },
  button: { alignSelf: "stretch" },
});
