import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { CARDS } from "./cards";
import { COLOR_WORDS, NUMBERS, cardKey, emojiFor } from "../lesson/pictures";

/**
 * The picture for a lesson word. A picture card from the pack when there is one; the numbers are
 * drawn as a big numeral with counting dots and the colours as a swatch, since a card for
 * "pula" would only be a red blob anyway.
 */
export default function WordPicture({ word, size = 110 }: { word: string; size?: number }) {
  const key = word.toLowerCase();
  const card = CARDS[cardKey(key)];
  if (card !== undefined) {
    return <Image source={card} contentFit="contain" style={{ width: size, height: size }} accessibilityLabel={word} />;
  }

  const count = NUMBERS[key];
  if (count !== undefined) {
    const perRow = count > 5 ? 5 : count;
    const rows = count > 5 ? 2 : 1;
    const dot = size * 0.1;
    return (
      <View style={[styles.box, { width: size, height: size, borderRadius: size * 0.22 }]} accessibilityLabel={word}>
        <Text style={[styles.numeral, { fontSize: size * 0.5, lineHeight: size * 0.72 }]}>{count}</Text>
        <View style={{ gap: dot * 0.5, alignItems: "center", marginTop: -size * 0.04 }}>
          {Array.from({ length: rows }, (_, r) => {
            const inRow = r === 0 ? perRow : count - 5;
            return (
              <View key={r} style={{ flexDirection: "row", gap: dot * 0.5 }}>
                {Array.from({ length: inRow }, (_, i) => (
                  <View key={i} style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: colors.accent }} />
                ))}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  const swatch = COLOR_WORDS[key];
  if (swatch !== undefined) {
    const d = size * 0.78;
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityLabel={word}>
        <View
          style={{
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: swatch,
            borderWidth: 3,
            borderColor: "rgba(58,34,16,0.18)",
            borderBottomWidth: 8,
          }}
        />
      </View>
    );
  }

  const emoji = emojiFor(key);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.6 }}>{emoji ?? "★"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.infoBg, alignItems: "center", justifyContent: "center", borderWidth: 2, borderBottomWidth: 6, borderColor: colors.info },
  numeral: { fontFamily: font.display, color: colors.infoInk, includeFontPadding: false },
});
