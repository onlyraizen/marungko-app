import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font } from "../../theme/fonts";
import { AUTH_BG, LOOPS, STILLS } from "../art/assets";

/**
 * The pond-blue palette of the account screens (the names are kept from the old dark brown theme).
 * Brown is only the text colour now; links are the design's link blue.
 */
export const dark = {
  bg: "#D9F0FA",
  field: "#FFFFFF",
  line: "#E6D8BC",
  text: "#3A2210",
  muted: "#6B5A47",
  green: "#6BD16E",
  coral: "#F26B52",
  coralDark: "#B23E2B",
  blue: "#14688F",
} as const;

export type Scene = "pond" | "plain" | "tall" | "clouds" | "none";

/** Clouds on top and the pond along the bottom, behind everything (design: Welcome, Details, Loading). */
function Scenery({ scene }: { scene: Scene }) {
  const { width } = useWindowDimensions();
  // If a picture fails to load, draw nothing for it: the plain sky is fine, a broken-image icon is not.
  const [clouds, setClouds] = useState(true);
  const [pondOk, setPondOk] = useState(true);
  if (scene === "none") return null;
  const pond = scene === "tall" ? AUTH_BG.pondTall : scene === "plain" ? AUTH_BG.pondPlain : AUTH_BG.pond;
  const ratio = scene === "tall" ? 520 / 390 : 260 / 390;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {clouds ? (
        <Image source={AUTH_BG.clouds} contentFit="fill" onError={() => setClouds(false)} style={{ position: "absolute", left: 0, top: 0, width, height: (240 / 390) * width }} />
      ) : null}
      {pondOk && scene !== "clouds" ? (
        <Image source={pond} contentFit="fill" onError={() => setPondOk(false)} style={{ position: "absolute", left: 0, bottom: 0, width, height: ratio * width }} />
      ) : null}
    </View>
  );
}

/** Page frame shared by the account screens: pond-blue sky, scenery, safe-area padding. */
export function DarkPage({ children, style, scene = "pond" }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; scene?: Scene }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) + 8 }, style]}>
      <Scenery scene={scene} />
      {children}
    </View>
  );
}

/** Capi waving hello. The animation file decodes after the still is already on screen. */
export function HelloCapi({ size = 220 }: { size?: number }) {
  return <Image source={LOOPS.hello} placeholder={STILLS.hello} autoplay contentFit="contain" style={{ width: size, height: size }} />;
}

/** Capi reading on a stack of books: "signing you in". */
export function ReadingCapi({ size = 240 }: { size?: number }) {
  return <Image source={LOOPS.reading} placeholder={STILLS.reading} autoplay contentFit="contain" style={{ width: size, height: size }} />;
}

/** "NAGSA-SIGN IN KA NA...": shown while the session and the child list load. */
export function SigningIn() {
  return (
    <DarkPage scene="tall" style={styles.center}>
      <ReadingCapi />
      <View style={styles.loaderCard}>
        <Text style={styles.loader}>NAGSA-SIGN IN KA NA</Text>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: "#5BC0F5" }]} />
          <View style={[styles.dot, { backgroundColor: "#6BD16E" }]} />
          <View style={[styles.dot, { backgroundColor: "#F7C531" }]} />
        </View>
      </View>
    </DarkPage>
  );
}

export const darkStyles = StyleSheet.create({
  title: { fontFamily: font.display, fontSize: 32, lineHeight: 46, color: dark.text, textAlign: "center", includeFontPadding: false },
  body: { fontFamily: font.body, fontSize: 17, lineHeight: 24, color: dark.muted, textAlign: "center" },
  label: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1.6, color: dark.muted },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: dark.bg, paddingHorizontal: 24 },
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  loaderCard: {
    marginTop: 24,
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: "#E6D8BC",
    borderRadius: 22,
  },
  loader: { fontFamily: font.bold, fontSize: 14, letterSpacing: 1.7, color: "#6F4020" },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
