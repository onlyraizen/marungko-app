import { Image } from "expo-image";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { ICONS } from "../art/assets";
import type { BookView } from "../book/books";
import ScreenHeader from "./ScreenHeader";

type Props = {
  books: readonly BookView[];
  progress: ReadonlyMap<string, { best_correct: number; total: number }>;
  streak: number;
  xp: number;
  onSettings: () => void;
};

type Award = { id: string; title: string; text: string; got: boolean; have?: number; need?: number };

/** "Mga Tagumpay": medals earned from the child's own progress. Nothing here is stored; it is worked out each time. */
export default function AwardsScreen({ books, progress, streak, xp, onSettings }: Props) {
  const lessons = progress.size;
  const perfect = [...progress.values()].some((p) => p.total > 0 && p.best_correct >= p.total);
  const awards: Award[] = [
    { id: "first", title: "Unang Hakbang", text: "Tapusin ang unang aralin.", got: lessons >= 1, have: lessons, need: 1 },
    { id: "five", title: "Masipag", text: "Tapusin ang 5 aralin.", got: lessons >= 5, have: lessons, need: 5 },
    { id: "ten", title: "Magaling na Mambabasa", text: "Tapusin ang 10 aralin.", got: lessons >= 10, have: lessons, need: 10 },
    { id: "perfect", title: "Perpekto!", text: "Tama lahat sa isang aralin.", got: perfect },
    { id: "s3", title: "Tatlong Araw", text: "3 araw na magkakasunod.", got: streak >= 3, have: streak, need: 3 },
    { id: "s7", title: "Isang Linggo", text: "7 araw na magkakasunod.", got: streak >= 7, have: streak, need: 7 },
    { id: "xp100", title: "100 XP", text: "Makakuha ng 100 XP.", got: xp >= 100, have: xp, need: 100 },
    { id: "xp500", title: "500 XP", text: "Makakuha ng 500 XP.", got: xp >= 500, have: xp, need: 500 },
    ...books
      .filter((book) => book.status !== "soon")
      .map((book) => ({
        id: book.id,
        title: `Tapos ang ${book.title}`,
        text: book.subtitle,
        got: book.status === "done",
        have: book.doneUnits,
        need: book.totalUnits,
      })),
  ];
  const earned = awards.filter((award) => award.got).length;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Mga Tagumpay" onSettings={onSettings} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.summary}>
          {earned} sa {awards.length} medalya
        </Text>
        <View style={styles.grid}>
          {awards.map((award) => (
            <View key={award.id} style={[styles.card, !award.got && styles.cardOff]}>
              <Image source={ICONS.tagumpay} contentFit="contain" style={[styles.medal, !award.got && styles.medalOff]} />
              <Text style={styles.title} numberOfLines={2}>
                {award.title}
              </Text>
              <Text style={styles.text} numberOfLines={2}>
                {award.text}
              </Text>
              {!award.got && award.need ? (
                <Text style={styles.progress}>
                  {Math.min(award.have ?? 0, award.need)} / {award.need}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  summary: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.4, color: colors.muted, textTransform: "uppercase", marginLeft: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47.5%",
    flexGrow: 1,
    alignItems: "center",
    gap: 2,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.border,
    borderRadius: 22,
  },
  cardOff: { backgroundColor: "#F4EEDF" },
  medal: { width: 68, height: 68 },
  medalOff: { opacity: 0.28 },
  title: { fontFamily: font.display, fontSize: 18, lineHeight: 26, color: colors.ink, textAlign: "center", includeFontPadding: false },
  text: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: colors.muted, textAlign: "center" },
  progress: { fontFamily: font.bold, fontSize: 13, color: colors.infoInk, marginTop: 2 },
});
