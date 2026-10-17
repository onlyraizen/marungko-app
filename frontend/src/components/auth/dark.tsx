import { Image } from "expo-image";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font } from "../../theme/fonts";
import { LOOPS, STILLS } from "../art/assets";

/** The dark brown palette of the account screens. */
export const dark = {
  bg: "#2B1A0F",
  field: "#36231A",
  line: "#5A3F2A",
  text: "#FFF3D6",
  muted: "#B9A58B",
  green: "#6BD16E",
  coral: "#F26B52",
  blue: "#5BC0F5",
} as const;

/** Page frame shared by the dark screens: brown background, safe-area padding. */
export function DarkPage({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.page, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) + 8 }, style]}>{children}</View>;
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
    <DarkPage style={styles.center}>
      <ReadingCapi />
      <Text style={styles.loader}>NAGSA-SIGN IN KA NA...</Text>
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
  loader: { fontFamily: font.display, fontSize: 20, lineHeight: 30, letterSpacing: 1.6, color: dark.text, includeFontPadding: false },
});
