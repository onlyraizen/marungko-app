import { useEffect, useRef } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { useGuideAudio } from "../../hooks/useGuideAudio";
import type { CompleteResult } from "../../services/progress";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { Capi, Ground } from "../art/Capi";
import Bubble from "../ui/Bubble";
import Button3D from "../ui/Button3D";
import { lessonMessage } from "./lessonText";

type Props = {
  title: string;
  correct: number;
  total: number;
  quizScore: { correct: number; total: number } | null;
  summary: CompleteResult | null;
  saving: boolean;
  saveError: string | null;
  guide: ReturnType<typeof useGuideAudio>;
  onDone: () => void;
};

function Tile({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={[styles.tile, { borderColor: tint }]}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, { color: tint }]}>{value}</Text>
    </View>
  );
}

/** "Magaling!": Capi cheers, says how it went, and shows the XP earned. */
export default function LessonResult({ title, correct, total, quizScore, summary, saving, saveError, guide, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const message = lessonMessage(correct, total);
  const spoken = useRef(false);

  // Capi says the verdict, then tells the child about the XP.
  useEffect(() => {
    if (spoken.current) return;
    spoken.current = true;
    const timer = setTimeout(() => guide.sayAll(saveError ? [message] : [message, "Nakakuha ka ng XP!"]), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>{title}</Text>
        <Text style={styles.heading}>Tapos na ang aralin!</Text>

        <View style={styles.capi}>
          <Capi pose={correct === total ? "cheer" : "nice"} size={230} />
          <Ground width={150} style={styles.ground} />
        </View>

        <Bubble tail="bottom" style={styles.bubble}>
          <Text style={styles.message}>{message}</Text>
        </Bubble>

        <View style={styles.tiles}>
          <Tile label="Tama" value={`${correct}/${total}`} tint={colors.primaryDark} />
          {quizScore ? <Tile label="Larawan" value={`${quizScore.correct}/${quizScore.total}`} tint={colors.infoDark} /> : null}
          <Tile label="XP" value={summary ? `+${summary.gained}` : saving ? "..." : "—"} tint={colors.accentDark} />
        </View>

        {saving ? <ActivityIndicator color={colors.primaryDark} /> : null}
        {summary ? (
          <Text style={styles.total}>
            Kabuuan: {summary.xp} XP · 🔥 {summary.streak} araw na magkakasunod
          </Text>
        ) : null}
        {saveError ? <Text style={styles.error}>Hindi na-save ang progreso: {saveError}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
        <Button3D label="Bumalik" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, alignItems: "center", gap: 12 },
  kicker: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.4, color: colors.muted, textTransform: "uppercase" },
  heading: { fontFamily: font.display, fontSize: 34, lineHeight: 40, color: colors.ink, textAlign: "center" },
  capi: { alignItems: "center" },
  ground: { marginTop: -22 },
  bubble: { alignSelf: "stretch", marginTop: 8 },
  message: { fontFamily: font.display, fontSize: 22, lineHeight: 30, color: colors.ink, textAlign: "center" },
  tiles: { flexDirection: "row", gap: 10, alignSelf: "stretch", marginTop: 8 },
  tile: { flex: 1, backgroundColor: colors.white, borderWidth: 2, borderBottomWidth: 5, borderRadius: 18, paddingVertical: 10, alignItems: "center" },
  tileLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.2, color: colors.muted, textTransform: "uppercase" },
  tileValue: { fontFamily: font.display, fontSize: 30, lineHeight: 36 },
  total: { fontFamily: font.bold, fontSize: 15, color: colors.ink, textAlign: "center" },
  error: { fontFamily: font.bold, fontSize: 14, color: colors.dangerDark, textAlign: "center" },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
