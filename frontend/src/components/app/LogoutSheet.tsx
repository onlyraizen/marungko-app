import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import { HelloCapi } from "../auth/dark";
import Button3D from "../ui/Button3D";
import TextLink from "../ui/TextLink";

/** "Aalis ka na ba?": a cream sheet over the screen. Staying is the big green button; logging out is the quiet one. */
export default function LogoutSheet({ onStay, onLogout }: { onStay: () => void; onLogout: () => void }) {
  const insets = useSafeAreaInsets();
  const rise = useRef(new Animated.Value(420)).current;
  useEffect(() => {
    Animated.spring(rise, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }).start();
  }, [rise]);
  return (
    <View style={styles.fill}>
      <Pressable style={styles.dim} onPress={onStay} accessibilityLabel="Manatili" />
      <Animated.View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12, transform: [{ translateY: rise }] }]}>
        <HelloCapi size={150} />
        <Text style={styles.title}>Aalis ka na ba?</Text>
        <Text style={styles.text}>Sigurado ka bang gusto mong mag-log out? Hihintayin ka namin ni Capi.</Text>
        <View style={styles.buttons}>
          <Button3D label="Manatili" onPress={onStay} />
          <TextLink label="Mag-log out" color={colors.dangerDark} onPress={onLogout} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 80 },
  dim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(58,34,16,0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 2,
    borderColor: colors.border,
  },
  title: { fontFamily: font.display, fontSize: 30, lineHeight: 44, color: colors.ink, includeFontPadding: false },
  text: { fontFamily: font.body, fontSize: 17, lineHeight: 24, color: colors.muted, textAlign: "center", marginBottom: 14 },
  buttons: { alignSelf: "stretch", gap: 4 },
});
