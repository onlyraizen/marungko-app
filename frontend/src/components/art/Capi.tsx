import { Image, type ImageStyle } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LOOPS, LOGO_FACE, PEEKS, POSES, type Loop, type Peek, type Pose } from "./assets";

type PoseProps = { pose?: Pose; size?: number; style?: StyleProp<ImageStyle> };

/** One of Capi's still poses. Every pose shares one canvas, so swapping poses never makes him jump. */
export function Capi({ pose = "rest", size = 200, style }: PoseProps) {
  return (
    <Image
      source={POSES[pose]}
      contentFit="contain"
      style={[{ width: size, height: size }, style]}
      accessibilityLabel="Si Capi na capybara"
    />
  );
}

type LoopProps = {
  /** Which animation to show while `playing`. */
  loop: Loop;
  playing: boolean;
  /** The still pose shown when nothing is playing. */
  rest?: Pose;
  size?: number;
};

/**
 * Capi talking or listening. The animation plays while `playing` is true; otherwise a still pose is shown.
 * The animated files are APNG, which expo-image plays on iOS and Android.
 */
export function CapiLoop({ loop, playing, rest = "rest", size = 200 }: LoopProps) {
  return playing ? (
    <Image
      key={loop}
      source={LOOPS[loop]}
      autoplay
      contentFit="contain"
      style={{ width: size, height: size }}
      accessibilityLabel={loop === "talk" ? "Nagsasalita si Capi" : "Nakikinig si Capi"}
    />
  ) : (
    <Capi pose={rest} size={size} />
  );
}

/** Capi's face, for the splash screen and small avatars. */
export function CapiFace({ size = 120 }: { size?: number }) {
  return <Image source={LOGO_FACE} contentFit="contain" style={{ width: size, height: size * (944 / 1120) }} />;
}

/** Capi peeking over the top edge of a book. The picture is cut at the bottom on purpose. */
export function CapiPeek({ peek, width = 130 }: { peek: Peek; width?: number }) {
  return <Image source={PEEKS[peek]} contentFit="contain" style={{ width, height: width * (780 / 1020) }} />;
}

/** The soft oval on the floor under a standing Capi. */
export function Ground({ width = 160, style }: { width?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.ground, { width, height: width * 0.16 }, style]} />;
}

const styles = StyleSheet.create({
  ground: { borderRadius: 100, backgroundColor: "rgba(60,100,130,0.16)" },
});
