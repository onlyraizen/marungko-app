import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import WordPicture from "../art/WordPicture";

type Props = {
  word: string;
  /** The syllable being practised, when this is a syllable ("sa" for saging); null for a whole word. */
  syllable?: string | null;
  size?: number;
};

/** The UI pack's picture card: a picture and its word, with the same thick lower edge as the other cards. */
export default function PictureCard({ word, syllable = null, size = 96 }: Props) {
  const wordSize = word.length > 12 ? 14 : word.length > 8 ? 18 : 24;
  return (
    <View style={[styles.card, { width: size + 28 }]}>
      <WordPicture word={word} size={size} />
      {syllable ? (
        <View style={styles.caption}>
          <Text style={styles.small}>
            <Text style={styles.syl}>{syllable.toUpperCase()}</Text> para sa
          </Text>
          <Text style={[styles.word, { fontSize: wordSize }]} numberOfLines={1} adjustsFontSizeToFit>
            {word}
          </Text>
        </View>
      ) : (
        <Text style={[styles.word, { fontSize: wordSize }]} numberOfLines={1} adjustsFontSizeToFit>
          {word}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 2,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.border,
    borderRadius: 22,
  },
  caption: { alignItems: "center", alignSelf: "stretch" },
  small: { fontFamily: font.body, fontSize: 13, color: colors.muted, textAlign: "center" },
  syl: { fontFamily: font.display, color: colors.infoInk, fontSize: 15 },
  word: { fontFamily: font.display, fontSize: 24, lineHeight: 34, color: colors.ink, textAlign: "center", includeFontPadding: false },
});
