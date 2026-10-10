import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../services/supabase";

type Mode = "signIn" | "signUp";

/** Parent account: email + password. The home screen reacts to the new session. */
export default function SignIn() {
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    const address = email.trim().toLowerCase();
    if (!address.includes("@")) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setMessage("Use at least 8 characters for the password.");
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
        setMessage("Account created. It must be confirmed before you can sign in.");
      }
    }
    setBusy(false);
  };

  const isSignIn = mode === "signIn";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marungko</Text>
      <Text style={styles.subtitle}>{isSignIn ? "Parent sign-in" : "Create a parent account"}</Text>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (8+ characters)"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {busy ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <Pressable style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>{isSignIn ? "Sign in" : "Create account"}</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.linkButton}
        onPress={() => {
          setMode(isSignIn ? "signUp" : "signIn");
          setMessage(null);
        }}
      >
        <Text style={styles.linkText}>
          {isSignIn ? "New here? Create an account" : "Already have an account? Sign in"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 64, gap: 14 },
  title: { fontSize: 32, fontWeight: "700" },
  subtitle: { fontSize: 18, color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    backgroundColor: "#fff",
  },
  message: { fontSize: 16, color: "#333" },
  spinner: { marginTop: 12 },
  button: {
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  linkButton: { alignItems: "center", paddingVertical: 8 },
  linkText: { color: "#1f6feb", fontSize: 16 },
});
