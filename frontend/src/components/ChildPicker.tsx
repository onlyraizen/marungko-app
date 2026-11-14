import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Child } from "../services/progress";
import { useAppStore } from "../store/useAppStore";
import { AVATARS, type AvatarId } from "./art/assets";
import AvatarPicker from "./ui/AvatarPicker";
import { font } from "../theme/fonts";
import { dark, darkStyles, DarkPage, HelloCapi } from "./auth/dark";
import Button3D from "./ui/Button3D";
import TextLink from "./ui/TextLink";
import { useT } from "../i18n";

type Props = {
  kids: readonly Child[];
  onSelect: (child: Child) => void;
  onCreate: (name: string, avatar: AvatarId) => Promise<void>;
  onSignOut: () => void;
  /** The parent or teacher has agreed to the privacy consent (RA 10173). A learner cannot be added before that. */
  consented: boolean;
  onConsent: () => void;
};

/** "Sino ang mag-aaral?" Pick a child profile, or add one. Dark, like the other account screens. */
export default function ChildPicker({ kids, onSelect, onCreate, onSignOut, consented, onConsent }: Props) {
  const t = useT();
  const [agreed, setAgreed] = useState(false);
  const avatars = useAppStore((state) => state.avatars);
  const [name, setName] = useState("");
  const [choice, setChoice] = useState<AvatarId>("capi");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const add = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 40) {
      setMessage("Maglagay ng pangalan (hanggang 40 titik).");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await onCreate(trimmed, choice);
      setName("");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <DarkPage>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <HelloCapi size={170} />
            <Text style={darkStyles.title}>Sino ang mag-aaral?</Text>
          </View>

          {kids.map((kid) => (
            <Pressable
              key={kid.id}
              style={({ pressed }) => [styles.card, pressed && { marginTop: 3, borderBottomWidth: 2 }]}
              onPress={() => onSelect(kid)}
              accessibilityRole="button"
              accessibilityLabel={kid.display_name}
            >
              <View style={styles.avatar}>
                <Image source={AVATARS[(avatars[kid.id] as AvatarId | undefined) ?? "capi"] ?? AVATARS.capi} contentFit="contain" style={styles.avatarImage} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {kid.display_name}
                </Text>
                <Text style={styles.cardMeta}>
                  {kid.xp} XP · {kid.streak_days} araw
                </Text>
              </View>
            </Pressable>
          ))}

          {consented ? null : (
            <View style={styles.consent} accessibilityLabel={t("consentTitle")}>
              <Text style={styles.consentTitle}>{t("consentTitle")}</Text>
              <Text style={styles.hint}>{t("consentIntro")}</Text>
              {(["consentPoint1", "consentPoint2", "consentPoint3", "consentPoint4"] as const).map((key) => (
                <Text key={key} style={styles.consentPoint}>
                  • {t(key)}
                </Text>
              ))}
              <Pressable
                style={styles.checkRow}
                onPress={() => setAgreed((value) => !value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
                accessibilityLabel={t("consentCheck")}
              >
                <View style={[styles.box, agreed && styles.boxOn]}>{agreed ? <Text style={styles.tick}>✓</Text> : null}</View>
                <Text style={styles.checkText}>{t("consentCheck")}</Text>
              </Pressable>
              <Button3D label={t("consentButton")} disabled={!agreed} onPress={onConsent} />
            </View>
          )}

          {consented ? (
            <>
              <Text style={darkStyles.label}>MAGDAGDAG NG MAG-AARAL</Text>
              <TextInput
                style={styles.field}
                placeholder="Palayaw (hindi buong pangalan)"
                placeholderTextColor={dark.muted}
                value={name}
                onChangeText={setName}
                maxLength={40}
              />
              <Text style={styles.hint}>Gumamit ng palayaw para sa privacy ng bata.</Text>
              <Text style={darkStyles.label}>PUMILI NG AVATAR</Text>
              <AvatarPicker value={choice} onChange={setChoice} dark />
              {message ? <Text style={styles.message}>{message}</Text> : null}
              {busy ? <ActivityIndicator color={dark.green} style={{ height: 60 }} /> : <Button3D label="Idagdag" disabled={name.trim().length === 0} onPress={add} />}
            </>
          ) : null}
          <TextLink label="Mag-log out" color={dark.coral} onPress={onSignOut} />
        </ScrollView>
      </DarkPage>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: dark.bg },
  scroll: { gap: 12, paddingBottom: 20 },
  hero: { alignItems: "center", gap: 6, marginBottom: 6 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    backgroundColor: dark.field,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: dark.line,
    borderRadius: 18,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#D9F0FA", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: 52, height: 52 },
  cardText: { flexShrink: 1 },
  cardTitle: { fontFamily: font.display, fontSize: 24, lineHeight: 34, color: dark.text, includeFontPadding: false },
  cardMeta: { fontFamily: font.body, fontSize: 14, color: dark.muted },
  field: { height: 56, paddingHorizontal: 16, borderRadius: 16, backgroundColor: dark.field, color: dark.text, fontFamily: font.body, fontSize: 18 },
  hint: { fontFamily: font.body, fontSize: 13, color: dark.muted },
  message: { fontFamily: font.bold, fontSize: 15, color: dark.coral },
  consent: { gap: 10, padding: 14, backgroundColor: dark.field, borderWidth: 2, borderBottomWidth: 5, borderColor: dark.line, borderRadius: 18 },
  consentTitle: { fontFamily: font.display, fontSize: 22, lineHeight: 30, color: dark.text, includeFontPadding: false },
  consentPoint: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: dark.text },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6, minHeight: 48 },
  box: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: dark.muted, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: dark.green, borderColor: dark.green },
  tick: { fontFamily: font.bold, fontSize: 18, color: "#10230F", includeFontPadding: false },
  checkText: { flexShrink: 1, fontFamily: font.bold, fontSize: 16, color: dark.text },
});
