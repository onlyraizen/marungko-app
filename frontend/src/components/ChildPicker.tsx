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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Child } from "../services/progress";
import { colors, radius } from "../theme/colors";
import Button3D from "./ui/Button3D";
import Mascot from "./ui/Mascot";

type Props = {
  kids: readonly Child[];
  onSelect: (child: Child) => void;
  onCreate: (name: string) => Promise<void>;
  onSignOut: () => void;
};

/** "Sino ang mag-aaral?" Pick a child profile, or add one. */
export default function ChildPicker({ kids, onSelect, onCreate, onSignOut }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
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
      await onCreate(trimmed);
      setName("");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Mascot size={110} />
          <Text style={styles.title}>Sino ang mag-aaral?</Text>
        </View>

        {kids.map((kid) => (
          <Pressable
            key={kid.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => onSelect(kid)}
            accessibilityRole="button"
            accessibilityLabel={kid.display_name}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{kid.display_name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{kid.display_name}</Text>
              <Text style={styles.cardMeta}>
                ⭐ {kid.xp} XP · 🔥 {kid.streak_days}
              </Text>
            </View>
          </Pressable>
        ))}

        <View style={styles.form}>
          <Text style={styles.formTitle}>Magdagdag ng mag-aaral</Text>
          <TextInput
            style={styles.input}
            placeholder="Palayaw (hindi buong pangalan)"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            maxLength={40}
          />
          <Text style={styles.hint}>Gumamit ng palayaw para sa privacy ng bata.</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {busy ? <ActivityIndicator color={colors.primary} /> : <Button3D label="Idagdag" onPress={add} />}
        </View>

        <Button3D label="Sign out" tone="neutral" small onPress={onSignOut} style={styles.signOut} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  hero: { alignItems: "center", gap: 8, marginBottom: 8 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    padding: 14,
  },
  cardPressed: { borderBottomWidth: 2, marginTop: 3 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.info,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: colors.infoDark,
  },
  avatarText: { fontSize: 24, fontWeight: "800", color: colors.ink },
  cardText: { gap: 2, flexShrink: 1 },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: "700" },
  cardMeta: { color: colors.muted, fontSize: 14 },
  form: { gap: 10, marginTop: 12 },
  formTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  hint: { color: colors.muted, fontSize: 13 },
  message: { color: colors.danger, fontSize: 15 },
  signOut: { marginTop: 12 },
});
