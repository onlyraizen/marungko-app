import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildReport, reportText, type AttemptReport } from "../../content/report";
import { getAttempts } from "../../services/progress";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { PARENT_ICONS, POSES } from "../art/assets";
import type { BookView } from "../book/books";
import Button3D from "../ui/Button3D";
import { BackIcon } from "../ui/Icons";

type Props = {
  childId: string;
  name: string;
  xp: number;
  streak: number;
  lessons: number;
  totalLessons: number;
  /** Different words in the lessons the child has finished. */
  wordsLearned: number;
  books: readonly BookView[];
  onBack: () => void;
};

/** A small sum a young child cannot do yet, so the report stays for grown-ups. */
function makeSum() {
  const a = 4 + Math.floor(Math.random() * 6);
  const b = 3 + Math.floor(Math.random() * 6);
  const answer = a + b;
  const wrong = new Set<number>();
  while (wrong.size < 2) {
    const guess = answer + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 3));
    if (guess !== answer && guess > 0) wrong.add(guess);
  }
  const choices = [answer, ...wrong].sort(() => Math.random() - 0.5);
  return { a, b, answer, choices };
}

function Gate({ onPass, onBack }: { onPass: () => void; onBack: () => void }) {
  const [sum, setSum] = useState(makeSum);
  const [missed, setMissed] = useState(false);
  return (
    <View style={styles.gate}>
      <Image source={PARENT_ICONS.lock} contentFit="contain" style={styles.gateIcon} />
      <Text style={styles.gateTitle}>Para sa magulang lamang</Text>
      <Text style={styles.gateText}>Sagutan ito para makita ang ulat.</Text>
      <Text style={styles.sum}>
        {sum.a} + {sum.b} = ?
      </Text>
      <View style={styles.choices}>
        {sum.choices.map((choice) => (
          <Button3D
            key={choice}
            label={String(choice)}
            tone="neutral"
            style={styles.choice}
            onPress={() => {
              if (choice === sum.answer) onPass();
              else {
                setMissed(true);
                setSum(makeSum());
              }
            }}
          />
        ))}
      </View>
      {missed ? <Text style={styles.gateMiss}>Subukan ulit.</Text> : null}
      <Button3D label="Bumalik" tone="outline" onPress={onBack} style={styles.gateBack} />
    </View>
  );
}

function Stat({ icon, label, value, note }: { icon: number; label: string; value: string; note?: string }) {
  return (
    <View style={styles.stat}>
      <Image source={icon} contentFit="contain" style={styles.statIcon} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {note ? <Text style={styles.statNote}>{note}</Text> : null}
    </View>
  );
}

/** "Ulat para sa Magulang": how the child is doing, from the saved lessons and attempts. */
export default function ParentReport({ childId, name, xp, streak, lessons, totalLessons, wordsLearned, books, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<AttemptReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getAttempts(childId)
      .then((rows) => {
        if (!cancelled) setReport(buildReport(rows));
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [open, childId]);

  const percent = totalLessons > 0 ? Math.round((lessons / totalLessons) * 100) : 0;
  const tracked = useMemo(() => books.filter((book) => book.status !== "soon"), [books]);
  const share = () => {
    if (!report) return;
    void Share.share({ message: reportText({ name, lessons, totalLessons, streak, xp, report }) });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Bumalik">
          <BackIcon color={colors.surface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Ulat para sa Magulang
        </Text>
        <View style={styles.headerButton} />
      </View>

      {!open ? (
        <Gate onPass={() => setOpen(true)} onBack={onBack} />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.who}>
            <Image source={POSES.pointChart} contentFit="contain" style={styles.capi} />
            <View style={styles.whoText}>
              <View style={styles.whoRow}>
                <Image source={PARENT_ICONS.child} contentFit="contain" style={styles.childIcon} />
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
              </View>
              <Text style={styles.sub}>
                {xp} XP · {streak} araw na magkakasunod
              </Text>
            </View>
          </View>

          <View style={styles.grid}>
            <Stat icon={PARENT_ICONS.progress} label="Natapos na aralin" value={`${lessons} / ${totalLessons}`} note={`${percent}% ng lahat`} />
            <Stat
              icon={PARENT_ICONS.pronunciation}
              label="Tamang sagot"
              value={report ? (report.accuracy === null ? "-" : `${Math.round(report.accuracy * 100)}%`) : "..."}
              note={report && report.attempts > 0 ? `${report.correct} sa ${report.attempts} subok` : undefined}
            />
            <Stat icon={PARENT_ICONS.time} label="Oras ngayong linggo" value={report ? `${report.minutesWeek} min` : "..."} note="Tinatayang oras" />
            <Stat icon={PARENT_ICONS.words} label="Mga salitang natutunan" value={String(wordsLearned)} note="Sa mga natapos na aralin" />
          </View>

          {error ? <Text style={styles.error}>Hindi ma-load ang ulat: {error}</Text> : null}
          {!report && !error ? <ActivityIndicator color={colors.primaryDark} /> : null}

          {report ? (
            <>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Image source={PARENT_ICONS.calendar} contentFit="contain" style={styles.cardIcon} />
                  <Text style={styles.cardTitle}>Huling 7 araw</Text>
                </View>
                <View style={styles.week}>
                  {report.week.map((day) => (
                    <View key={day.day} style={styles.day}>
                      <View style={[styles.dayDot, day.count > 0 && styles.dayDotOn]}>
                        {day.count > 0 ? <Text style={styles.dayCount}>{day.count}</Text> : null}
                      </View>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.cardNote}>Ang bilang sa bawat araw ay ang dami ng sinubukang salita at tunog.</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Image source={PARENT_ICONS.pronunciation} contentFit="contain" style={styles.cardIcon} />
                  <Text style={styles.cardTitle}>Dapat pang pagsanayan</Text>
                </View>
                {report.hardest.length === 0 ? (
                  <Text style={styles.cardNote}>
                    {report.attempts < 5 ? "Kakaunti pa ang datos. Mag-aral pa ng ilang aralin para lumabas dito." : "Magaling! Walang tunog na madalas pang mali."}
                  </Text>
                ) : (
                  <View style={styles.chips}>
                    {report.hardest.map((entry) => (
                      <View key={entry.item} style={styles.chip}>
                        <Text style={styles.chipWord}>{entry.item}</Text>
                        <Text style={styles.chipRate}>{Math.round(entry.rate * 100)}% tama</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Image source={PARENT_ICONS.progress} contentFit="contain" style={styles.cardIcon} />
              <Text style={styles.cardTitle}>Mga libro</Text>
            </View>
            {tracked.map((book) => {
              const fraction = book.totalUnits > 0 ? book.doneUnits / book.totalUnits : 0;
              return (
                <View key={book.id} style={styles.bookRow}>
                  <Text style={styles.bookName} numberOfLines={1}>
                    {book.title}: {book.subtitle}
                  </Text>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} />
                  </View>
                  <Text style={styles.bookCount}>
                    {book.doneUnits} / {book.totalUnits} aralin
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.shareRow}>
            <Image source={PARENT_ICONS.report} contentFit="contain" style={styles.cardIcon} />
            <View style={styles.shareButton}>
              <Button3D label="Ibahagi ang ulat" tone="info" disabled={!report} onPress={share} />
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 10, backgroundColor: colors.brown, borderBottomWidth: 5, borderBottomColor: "#4E2D13" },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: font.display, fontSize: 24, lineHeight: 34, color: colors.surface, includeFontPadding: false },
  content: { padding: 16, gap: 14 },
  gate: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 8 },
  gateIcon: { width: 96, height: 96 },
  gateTitle: { fontFamily: font.display, fontSize: 26, lineHeight: 38, color: colors.ink, includeFontPadding: false },
  gateText: { fontFamily: font.body, fontSize: 16, color: colors.muted, textAlign: "center" },
  sum: { fontFamily: font.display, fontSize: 44, lineHeight: 62, color: colors.ink, marginTop: 8, includeFontPadding: false },
  choices: { flexDirection: "row", gap: 12, alignSelf: "stretch" },
  choice: { flex: 1, paddingHorizontal: 0 },
  gateMiss: { fontFamily: font.bold, fontSize: 15, color: colors.dangerDark },
  gateBack: { alignSelf: "stretch", marginTop: 14 },
  who: { flexDirection: "row", alignItems: "center", gap: 4 },
  capi: { width: 120, height: 120, marginLeft: -8 },
  whoText: { flex: 1, gap: 2 },
  whoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  childIcon: { width: 36, height: 36 },
  name: { flexShrink: 1, fontFamily: font.display, fontSize: 28, lineHeight: 40, color: colors.ink, includeFontPadding: false },
  sub: { fontFamily: font.bold, fontSize: 14, color: colors.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { width: "47.5%", flexGrow: 1, backgroundColor: colors.white, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.border, borderRadius: 20, padding: 12, alignItems: "center", gap: 0 },
  statIcon: { width: 44, height: 44 },
  statLabel: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.8, color: colors.muted, textAlign: "center", marginTop: 4 },
  statValue: { fontFamily: font.display, fontSize: 28, lineHeight: 40, color: colors.ink, includeFontPadding: false },
  statNote: { fontFamily: font.body, fontSize: 13, color: colors.muted, textAlign: "center" },
  card: { backgroundColor: colors.white, borderWidth: 2, borderBottomWidth: 5, borderColor: colors.border, borderRadius: 20, padding: 14, gap: 10 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon: { width: 40, height: 40 },
  cardTitle: { fontFamily: font.display, fontSize: 20, lineHeight: 30, color: colors.ink, includeFontPadding: false },
  cardNote: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  week: { flexDirection: "row", justifyContent: "space-between" },
  day: { alignItems: "center", gap: 4, flex: 1 },
  dayDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.locked, alignItems: "center", justifyContent: "center" },
  dayDotOn: { backgroundColor: colors.primary },
  dayCount: { fontFamily: font.bold, fontSize: 13, color: "#1D3B1A" },
  dayLabel: { fontFamily: font.bold, fontSize: 12, color: colors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.dangerBg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, alignItems: "center" },
  chipWord: { fontFamily: font.display, fontSize: 20, lineHeight: 28, color: colors.dangerDark, includeFontPadding: false },
  chipRate: { fontFamily: font.bold, fontSize: 11, color: colors.dangerDark },
  bookRow: { gap: 4 },
  bookName: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  track: { height: 12, borderRadius: 6, backgroundColor: colors.locked, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6, backgroundColor: colors.primary },
  bookCount: { fontFamily: font.body, fontSize: 12, color: colors.muted },
  shareRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  shareButton: { flex: 1 },
  error: { fontFamily: font.bold, fontSize: 14, color: colors.dangerDark, textAlign: "center" },
});
