import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LessonPart } from "../../content/parts";
import { useT } from "../../i18n";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { Capi } from "../art/Capi";
import Button3D from "../ui/Button3D";
import ExerciseFrame from "./ExerciseFrame";

type Props = {
  part: LessonPart;
  /** Which part this is (1 to total) and how many there are. */
  number: number;
  total: number;
  progress: number;
  combo: number;
  yuzu: number;
  onStart: () => void;
  onClose: () => void;
};

/** Shown before each part of a lesson ("Dalawang pantig"), so a child knows what kind of words come next. */
export default function PartIntro({ part, number, total, progress, combo, yuzu, onStart, onClose }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <ExerciseFrame title={t("partWord", { n: number, total })} progress={progress} combo={combo} yuzu={yuzu} onClose={onClose}>
      <View style={styles.body}>
        <Capi pose="wave" size={210} />
        <Text style={styles.title}>{t(part.title)}</Text>
        <Text style={styles.text}>{t(part.body)}</Text>
      </View>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        <Button3D label={t("partGo")} onPress={onStart} />
      </View>
    </ExerciseFrame>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24 },
  title: { fontFamily: font.display, fontSize: 34, lineHeight: 48, color: colors.ink, textAlign: "center", includeFontPadding: false },
  text: { fontFamily: font.body, fontSize: 18, lineHeight: 26, color: "#3F6173", textAlign: "center" },
  footer: { paddingHorizontal: 20 },
});
