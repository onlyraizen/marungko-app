import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../../theme/colors";

type Props = {
  children: ReactNode;
  /** Which side the little tail points to, toward the speaker. */
  tail?: "left" | "bottom" | "bottomLeft" | "right" | "none";
  style?: StyleProp<ViewStyle>;
  /** Height of the left or right tail from the top edge. */
  tailTop?: number;
};

/** A white speech bubble with a thick lower edge, like the cards in the UI pack. */
export default function Bubble({ children, tail = "left", style, tailTop }: Props) {
  return (
    <View style={[styles.bubble, style]}>
      {children}
      {tail === "left" ? <View style={[styles.tailLeft, tailTop !== undefined && { top: tailTop }]} /> : null}
      {tail === "bottom" ? <View style={styles.tailBottom} /> : null}
      {tail === "bottomLeft" ? <View style={[styles.tailBottom, { left: 60, bottom: -11 }]} /> : null}
      {tail === "right" ? <View style={[styles.tailRight, tailTop !== undefined && { top: tailTop }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 14,
  },
  // A rotated square, half hidden behind the bubble's border, reads as a tail.
  tailLeft: {
    position: "absolute",
    left: -9,
    top: 26,
    width: 16,
    height: 16,
    backgroundColor: colors.white,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.border,
    transform: [{ rotate: "45deg" }],
  },
  tailRight: {
    position: "absolute",
    right: -9,
    top: 34,
    width: 14,
    height: 14,
    backgroundColor: colors.white,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.border,
    transform: [{ rotate: "45deg" }],
  },
  tailBottom: {
    position: "absolute",
    bottom: -10,
    left: 40,
    width: 16,
    height: 16,
    backgroundColor: colors.white,
    borderRightWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    transform: [{ rotate: "45deg" }],
  },
});
