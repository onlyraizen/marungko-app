import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { medalLabel } from "../../content/awards";
import type { useGuideAudio } from "../../hooks/useGuideAudio";
import { playSfx } from "../../hooks/useSfx";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { FLAME, ICONS, LOOPS, MEDAL_ART, POSES, type MedalId } from "../art/assets";
import Button3D from "../ui/Button3D";
import { YuzuIcon } from "../ui/Icons";
import type { LessonSummary } from "./LessonScreen";
import { lessonMessage } from "./lessonText";

type Props = {
  title: string;
  practice: { correct: number; total: number };
  quiz: { correct: number; total: number } | null;
  /** Yuzu earned in this lesson. */
  yuzu: number;
  /** Review ("Balik-aral"): there is no XP to show. */
  review: boolean;
  summary: LessonSummary | null;
  saving: boolean;
  saveError: string | null;
  guide: ReturnType<typeof useGuideAudio>;
  onDone: () => void;
};

/** "Natapos mo ang aralin!": Capi celebrates, with the XP, the score, and any new medal. */
export default function LessonResult({ title, practice, quiz, yuzu, review, summary, saving, saveError, guide, onDone }: Props) {
  const correct = practice.correct + (quiz?.correct ?? 0);
  const total = practice.total + (quiz?.total ?? 0);
  const insets = useSafeAreaInsets();
  const message = lessonMessage(correct, total);
  const spoken = useRef(false);
  const medalHeard = useRef(false);
  const medals = summary?.medals ?? [];
  const firstMedal = medals[0];

  // The fanfare, then Capi says the verdict and tells the child about the XP.
  useEffect(() => {
    if (spoken.current) return;
    spoken.current = true;
    void playSfx("finished");
    const timer = setTimeout(() => guide.sayAll(saveError || review ? [message] : [message, "Nakakuha ka ng XP!"]), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A longer streak gets its own sound, unless a medal is about to play one.
  const streakUp = summary?.streakUp === true && !review;
  const streakHeard = useRef(false);
  useEffect(() => {
    if (!streakUp || firstMedal !== undefined || streakHeard.current) return;
    streakHeard.current = true;
    const timer = setTimeout(() => void playSfx("streakLit"), 800);
    return () => clearTimeout(timer);
  }, [streakUp, firstMedal]);

  // A new medal gets its own chime when it appears.
  useEffect(() => {
    if (firstMedal === undefined || medalHeard.current) return;
    medalHeard.current = true;
    const timer = setTimeout(() => void playSfx("medal"), 700);
    return () => clearTimeout(timer);
  }, [firstMedal]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
        <Image source={LOOPS.celebrate} placeholder={POSES.celebrate} autoplay contentFit="contain" style={styles.capi} accessibilityLabel="Nagdiriwang si Capi" />
        <Text style={styles.kicker}>{title}</Text>
        <Text style={styles.heading}>{review ? "Tapos na ang balik-aral!" : "Natapos mo ang aralin!"}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.tiles}>
          {review ? (
            <View style={[styles.tile, { borderColor: colors.accent }]}>
              <Text style={[styles.tileLabel, { color: "#8A6100" }]}>YUZU</Text>
              <View style={styles.tileRow}>
                <YuzuIcon size={26} />
                <Text style={styles.tileValue}>+{yuzu}</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.tile, { borderColor: colors.accent }]}>
              <Text style={[styles.tileLabel, { color: "#8A6100" }]}>KUHANG XP</Text>
              <View style={styles.tileRow}>
                <Image source={ICONS.star} contentFit="contain" style={styles.tileIcon} />
                <Text style={styles.tileValue}>{summary ? `+${summary.gained}` : saving ? "..." : "-"}</Text>
              </View>
            </View>
          )}
          <View style={[styles.tile, { borderColor: colors.primary }]}>
            <Text style={[styles.tileLabel, { color: colors.primaryInk }]}>TAMA</Text>
            <Text style={styles.tileValue}>
              {correct} / {total}
            </Text>
          </View>
        </View>

        {streakUp && summary ? (
          <View style={styles.medalCard}>
            <Image source={FLAME.extend} autoplay contentFit="contain" style={styles.flame} />
            <View style={styles.medalText}>
              <Text style={styles.medalKicker}>APOY NG PAG-AARAL</Text>
              <Text style={styles.medalName}>{summary.streak} araw na magkakasunod!</Text>
            </View>
          </View>
        ) : null}

        {firstMedal !== undefined ? (
          <View style={styles.medalCard}>
            <Image source={MEDAL_ART[firstMedal as MedalId].on} contentFit="contain" style={styles.medal} />
            <View style={styles.medalText}>
              <Text style={styles.medalKicker}>BAGONG MEDALYA</Text>
              <Text style={styles.medalName}>
                {medalLabel(firstMedal)}
                {medals.length > 1 ? ` +${medals.length - 1} pa` : ""}
              </Text>
            </View>
          </View>
        ) : null}

        {saving ? <ActivityIndicator color={colors.primaryDark} /> : null}
        {summary ? (
          <Text style={styles.total}>
            Kabuuan: {summary.xp} XP · {summary.streak} araw na magkakasunod
          </Text>
        ) : null}
        {saveError ? <Text style={styles.error}>Hindi na-save ang progreso: {saveError}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
        <Button3D label="Tuloy" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, alignItems: "center", gap: 10 },
  capi: { width: 300, height: 300 },
  kicker: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.4, color: colors.muted, textTransform: "uppercase" },
  heading: { fontFamily: font.display, fontSize: 30, lineHeight: 44, color: colors.ink, textAlign: "center", includeFontPadding: false },
  message: { fontFamily: font.body, fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: "center", marginBottom: 4 },
  tiles: { flexDirection: "row", gap: 12, alignSelf: "stretch" },
  tile: { flex: 1, backgroundColor: colors.white, borderWidth: 2, borderBottomWidth: 5, borderRadius: 20, paddingVertical: 12, alignItems: "center", gap: 2 },
  tileLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.4 },
  tileRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tileIcon: { width: 28, height: 28 },
  tileValue: { fontFamily: font.display, fontSize: 30, lineHeight: 44, color: colors.ink, includeFontPadding: false },
  medalCard: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    borderRadius: 20,
  },
  medal: { width: 56, height: 56 },
  flame: { width: 64, height: 64, marginVertical: -6 },
  medalText: { flex: 1 },
  medalKicker: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.4, color: colors.muted },
  medalName: { fontFamily: font.display, fontSize: 22, lineHeight: 32, color: colors.ink, includeFontPadding: false },
  total: { fontFamily: font.bold, fontSize: 14, color: colors.muted, textAlign: "center" },
  error: { fontFamily: font.bold, fontSize: 14, color: colors.dangerDark, textAlign: "center" },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
