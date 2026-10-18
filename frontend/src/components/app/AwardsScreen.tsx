import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MEDALS } from "../../content/awards";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { ICONS, MEDAL_ART } from "../art/assets";
import ScreenHeader from "./ScreenHeader";

/** "Mga Tagumpay": every medal, coloured once earned and grey while still locked. Tap one to see how to earn it. */
export default function AwardsScreen({ earned }: { earned: ReadonlySet<string> }) {
  const [picked, setPicked] = useState<string | null>(null);
  const count = MEDALS.filter((medal) => earned.has(medal.id)).length;
  const percent = Math.round((count / MEDALS.length) * 100);
  const info = MEDALS.find((medal) => medal.id === picked);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Mga Tagumpay" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Image source={ICONS.star} contentFit="contain" style={styles.summaryStar} />
          <Text style={styles.summaryText}>
            {count} sa {MEDALS.length} na medalya
          </Text>
          <Text style={styles.percent}>{percent}%</Text>
        </View>

        {info ? (
          <View style={styles.how}>
            <Text style={styles.howText}>
              {earned.has(info.id) ? `${info.label}: nakuha mo na!` : `${info.label}: ${info.how}`}
            </Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          {MEDALS.map((medal) => {
            const got = earned.has(medal.id);
            return (
              <Pressable
                key={medal.id}
                onPress={() => setPicked(picked === medal.id ? null : medal.id)}
                accessibilityRole="button"
                accessibilityLabel={`${medal.label}, ${got ? "nakuha na" : "naka-lock"}`}
                style={styles.cell}
              >
                <Image source={got ? MEDAL_ART[medal.id].on : MEDAL_ART[medal.id].off} contentFit="contain" style={styles.medal} />
                <Text style={[styles.label, !got && styles.labelOff]} numberOfLines={2}>
                  {medal.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    height: 64,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    borderRadius: 20,
  },
  summaryStar: { width: 32, height: 32 },
  summaryText: { flex: 1, fontFamily: font.display, fontSize: 20, lineHeight: 30, color: colors.ink, includeFontPadding: false },
  percent: { fontFamily: font.display, fontSize: 18, lineHeight: 28, color: colors.infoInk, includeFontPadding: false },
  how: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 },
  howText: { fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 14 },
  cell: { width: "33.333%", alignItems: "center", gap: 2, paddingHorizontal: 4 },
  medal: { width: 76, height: 76 },
  label: { fontFamily: font.display, fontSize: 14, lineHeight: 20, color: colors.ink, textAlign: "center", includeFontPadding: false },
  labelOff: { color: "#A09078" },
});
