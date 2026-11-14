import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font } from "../../theme/fonts";
import { dark } from "./dark";

/** The six boxes of the email code. `wrong` turns them coral (design: Email Code, wrong code). */
export function CodeBoxes({ digits, length = 6, wrong = false }: { digits: string; length?: number; wrong?: boolean }) {
  return (
    <View style={styles.boxes} accessibilityRole="text" accessibilityLabel={`${digits.length} / ${length}`}>
      {Array.from({ length }, (_, i) => {
        const filled = i < digits.length;
        const current = i === digits.length && !wrong;
        return (
          <View
            key={i}
            style={[
              styles.box,
              filled && styles.boxFilled,
              current && styles.boxCurrent,
              wrong && styles.boxWrong,
            ]}
          >
            <Text style={[styles.digit, wrong && { color: "#B23E2B" }]}>{filled ? digits[i] : ""}</Text>
          </View>
        );
      })}
    </View>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

/**
 * Number pad drawn by the app, so a child's parent never needs the phone keyboard to type the code.
 * It sits at the bottom edge of the screen (a full-width panel).
 */
export function CodeKeypad({ onDigit, onBack, disabled = false }: { onDigit: (digit: string) => void; onBack: () => void; disabled?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.pad, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
      {KEYS.map((key, i) =>
        key === "" ? (
          <View key={i} style={styles.key} />
        ) : key === "back" ? (
          <Pressable key={i} onPress={onBack} disabled={disabled} accessibilityRole="button" accessibilityLabel="Burahin" style={[styles.key, styles.keyBare]}>
            <Svg width={34} height={34} viewBox="0 0 24 24">
              <Path d="M9 5 H20 V19 H9 L3 12 Z" fill="none" stroke="#3A5F73" strokeWidth={2.2} strokeLinejoin="round" />
              <Path d="M12.5 9 L17 15 M17 9 L12.5 15" stroke="#3A5F73" strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
          </Pressable>
        ) : (
          <Pressable
            key={i}
            onPress={() => onDigit(key)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={key}
            style={({ pressed }) => [styles.key, styles.keyFace, pressed && styles.keyPressed]}
          >
            <Text style={styles.keyText}>{key}</Text>
          </Pressable>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: "row", justifyContent: "center", gap: 8 },
  box: { width: 48, height: 60, alignItems: "center", justifyContent: "center", borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: "#A9CFE0", backgroundColor: "rgba(255,255,255,0.55)" },
  boxFilled: { borderColor: "#CDBFA4", borderBottomWidth: 6, backgroundColor: "#FFFFFF" },
  boxCurrent: { borderColor: "#5BC0F5", borderBottomColor: "#3A9ED4", borderBottomWidth: 6, backgroundColor: "#E1F4FD" },
  boxWrong: { borderColor: "#F26B52", borderBottomColor: "#D9503A", borderBottomWidth: 6, backgroundColor: "#FFE3DC" },
  digit: { fontFamily: font.display, fontSize: 32, lineHeight: 44, color: dark.text, includeFontPadding: false },
  pad: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 16, paddingHorizontal: 20, backgroundColor: "#BFE3F3", borderTopWidth: 3, borderTopColor: "#9CCBE0", borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  key: { width: "31.2%", height: 54, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  keyFace: { borderWidth: 2, borderBottomWidth: 5, borderColor: "#CDBFA4", backgroundColor: "#FFFFFF" },
  keyPressed: { borderBottomWidth: 2, marginTop: 3, height: 51 },
  keyBare: { backgroundColor: "transparent" },
  keyText: { fontFamily: font.display, fontSize: 30, lineHeight: 42, color: dark.text, includeFontPadding: false },
});
