import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import Button3D from "../ui/Button3D";
import { CheckIcon, CrossIcon, FlagIcon, ShareIcon } from "../ui/Icons";
import TextLink from "../ui/TextLink";

type Props = {
  good: boolean;
  title: string;
  /** Small bold heading above the line, e.g. "Kahulugan:". */
  kicker?: string;
  /** The main line, e.g. "bata: maliit na tao". */
  line?: string;
  children?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  /** An outlined button above the main one: "IPALIWANAG ANG SAGOT KO". */
  outlineLabel?: string;
  onOutline?: () => void;
  /** A quiet text button under the main one: "LAKTAWAN". */
  linkLabel?: string;
  onLink?: () => void;
  onShare?: () => void;
  onFlag?: () => void;
  flagged?: boolean;
};

/** The sheet that slides up after an answer: green when it was right, coral when it was not. */
export default function FeedbackSheet(props: Props) {
  const { good, title, kicker, line, children, primaryLabel, onPrimary, outlineLabel, onOutline, linkLabel, onLink, onShare, onFlag, flagged } = props;
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(360)).current;

  useEffect(() => {
    slide.setValue(360);
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 14 }).start();
  }, [slide]);

  const ink = good ? colors.primaryInk : colors.dangerDark;
  const body = good ? "#1F4A28" : "#6B2A1E";
  const icon = good ? "#2E8B45" : colors.redBook;

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          paddingBottom: Math.max(insets.bottom, 12) + 14,
          backgroundColor: good ? colors.primaryBg : colors.dangerBg,
          borderTopColor: good ? colors.primary : colors.danger,
          transform: [{ translateY: slide }],
        },
      ]}
    >
      <View style={styles.titleRow}>
        <View style={[styles.badge, { backgroundColor: good ? "#2E8B45" : colors.redBook }]}>{good ? <CheckIcon /> : <CrossIcon />}</View>
        <Text style={[styles.title, { color: ink }]}>{title}</Text>
        {onShare ? (
          <Pressable onPress={onShare} style={styles.tool} accessibilityRole="button" accessibilityLabel="I-share">
            <ShareIcon color={icon} />
          </Pressable>
        ) : null}
        {onFlag ? (
          <Pressable onPress={onFlag} style={styles.tool} accessibilityRole="button" accessibilityLabel="I-report">
            <FlagIcon color={icon} filled={flagged} />
          </Pressable>
        ) : null}
      </View>
      {kicker || line ? (
        <View style={styles.lines}>
          {kicker ? <Text style={[styles.kicker, { color: ink }]}>{kicker}</Text> : null}
          {line ? <Text style={[styles.line, { color: body }]}>{line}</Text> : null}
        </View>
      ) : null}
      {children}
      <View style={styles.buttons}>
        {outlineLabel && onOutline ? <Button3D label={outlineLabel} tone={good ? "outline" : "outlineDanger"} onPress={onOutline} /> : null}
        <Button3D label={primaryLabel} tone={good ? "primary" : "danger"} onPress={onPrimary} />
        {linkLabel && onLink ? <TextLink label={linkLabel} onPress={onLink} color={ink} /> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 3,
    zIndex: 50,
    elevation: 50,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: font.display, fontSize: 26, lineHeight: 38, includeFontPadding: false },
  tool: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  lines: { gap: 2 },
  kicker: { fontFamily: font.bold, fontSize: 16 },
  line: { fontFamily: font.body, fontSize: 20, lineHeight: 28 },
  buttons: { gap: 10, marginTop: 4 },
});
