import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import Button3D from "../ui/Button3D";

type Props = {
  good: boolean;
  title: string;
  /** A line under the title, such as what the app heard. */
  line?: string;
  children?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

/** The sheet that slides up after an answer: green when it was right, coral when it was not. */
export default function FeedbackSheet({ good, title, line, children, primaryLabel, onPrimary, secondaryLabel, onSecondary }: Props) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(320)).current;

  useEffect(() => {
    slide.setValue(320);
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 7, speed: 14 }).start();
  }, [slide]);

  const ink = good ? colors.primaryInk : colors.dangerDark;

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
        <View style={[styles.badge, { backgroundColor: good ? colors.primary : colors.danger }]}>
          <Text style={styles.badgeText}>{good ? "✓" : "✕"}</Text>
        </View>
        <Text style={[styles.title, { color: ink }]}>{title}</Text>
      </View>
      {line ? <Text style={[styles.line, { color: ink }]}>{line}</Text> : null}
      {children}
      <Button3D label={primaryLabel} tone={good ? "primary" : "danger"} onPress={onPrimary} />
      {secondaryLabel && onSecondary ? (
        <Pressable onPress={onSecondary} style={styles.secondary} accessibilityRole="button">
          <Text style={[styles.secondaryText, { color: ink }]}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
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
    paddingTop: 18,
    gap: 10,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 3,
    zIndex: 50,
    elevation: 50,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#FFFFFF", fontSize: 22, fontFamily: font.display, lineHeight: 28 },
  title: { fontFamily: font.display, fontSize: 30, lineHeight: 36 },
  line: { fontFamily: font.bold, fontSize: 16 },
  secondary: { alignItems: "center", paddingVertical: 8 },
  secondaryText: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase" },
});
