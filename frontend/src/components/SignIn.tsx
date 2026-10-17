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
import { supabase } from "../services/supabase";
import { colors, radius } from "../theme/colors";
import { font } from "../theme/fonts";
import Button3D from "./ui/Button3D";
import Mascot from "./ui/Mascot";

type Mode = "signIn" | "signUp";

/** Parent account: email + password. The home screen reacts to the new session. */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    const address = email.trim().toLowerCase();
    if (!address.includes("@")) {
      setMessage("Maglagay ng tamang email address.");
      return;
    }
    if (password.length < 8) {
      setMessage("Gumamit ng hindi bababa sa 8 titik para sa password.");
      return;
    }
    setBusy(true);
    setMessage(null);

    if (mode === "signIn") {
      const { error } = await supabase.auth.signInWithPassword({ email: address, password });
      if (error) setMessage(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email: address, password });
      if (error) {
        setMessage(error.message);
      } else if (!data.session) {
        // Happens while email confirmation is on: the account exists but is unconfirmed.
        setMessage("Nagawa ang account. Kailangan itong ma-confirm bago ka makapag-sign in.");
      }
    }
    setBusy(false);
  };

  const isSignIn = mode === "signIn";

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Mascot size={130} mood="cheer" />
          <Text style={styles.title}>Basa-Bata</Text>
          <Text style={styles.subtitle}>{isSignIn ? "Pag-sign in ng magulang" : "Gumawa ng account ng magulang"}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (8+ titik)"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {busy ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : (
          <Button3D label={isSignIn ? "Mag-sign in" : "Gumawa ng account"} onPress={submit} />
        )}

        <Pressable
          style={styles.link}
          onPress={() => {
            setMode(isSignIn ? "signUp" : "signIn");
            setMessage(null);
          }}
        >
          <Text style={styles.linkText}>
            {isSignIn ? "Bago ka ba? Gumawa ng account" : "May account na? Mag-sign in"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 24, paddingBottom: 40, gap: 14 },
  hero: { alignItems: "center", gap: 6, marginBottom: 12 },
  title: { color: colors.text, fontFamily: font.display, fontSize: 44 },
  subtitle: { color: colors.muted, fontFamily: font.body, fontSize: 17 },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 18,
    fontFamily: font.body,
    color: colors.text,
    backgroundColor: colors.white,
  },
  message: { color: colors.dangerDark, fontFamily: font.bold, fontSize: 15 },
  spinner: { marginVertical: 12 },
  link: { alignItems: "center", paddingVertical: 10 },
  linkText: { color: colors.infoInk, fontFamily: font.bold, fontSize: 16 },
});
