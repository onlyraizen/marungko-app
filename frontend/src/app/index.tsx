import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import LiveTranscript from "../components/LiveTranscript";
import MicSpike from "../components/MicSpike";
import SignIn from "../components/SignIn";
import WordExercise from "../components/WordExercise";
import { supabase } from "../services/supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type Screen = "home" | "mic" | "live" | "word";

/** Phase 1 home: sign in, prove the backend accepts our token, open the voice spikes. */
export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [check, setCheck] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const checkBackend = async () => {
    if (!API_URL || !session) {
      setCheck("Missing EXPO_PUBLIC_API_URL or session.");
      return;
    }
    setCheck("Checking...");
    try {
      const response = await fetch(`${API_URL}/api/v1/speech/session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ terms: ["ma", "me", "mi"] }),
      });
      const body: unknown = await response.json();
      if (response.ok && typeof body === "object" && body !== null && "expiresAt" in body) {
        // Never display the key itself, only that one was issued.
        const expires = String((body as { expiresAt: unknown }).expiresAt);
        setCheck(`OK (HTTP ${response.status}). Speech key issued, expires ${expires}.`);
      } else {
        setCheck(`HTTP ${response.status}: ${JSON.stringify(body)}`);
      }
    } catch (caught) {
      setCheck(`Network error: ${caught instanceof Error ? caught.message : String(caught)}`);
    }
  };

  if (!ready) {
    return <ActivityIndicator style={styles.loading} />;
  }

  if (!session) {
    return <SignIn />;
  }

  if (screen !== "home") {
    return (
      <View style={styles.flex}>
        <Pressable style={styles.back} onPress={() => setScreen("home")}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        {screen === "mic" ? <MicSpike /> : null}
        {screen === "live" ? <LiveTranscript /> : null}
        {screen === "word" ? <WordExercise /> : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Signed in</Text>
      <Text style={styles.line}>{session.user.email}</Text>

      <Pressable style={styles.button} onPress={checkBackend}>
        <Text style={styles.buttonText}>Check backend login</Text>
      </Pressable>
      {check ? <Text style={styles.result}>{check}</Text> : null}

      <Pressable style={styles.button} onPress={() => setScreen("word")}>
        <Text style={styles.buttonText}>Say the word</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => setScreen("live")}>
        <Text style={styles.buttonText}>Live transcript</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => setScreen("mic")}>
        <Text style={styles.buttonText}>Open mic spike</Text>
      </Pressable>

      <Pressable style={styles.outline} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.outlineText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 120 },
  container: { padding: 24, paddingTop: 64, gap: 14 },
  title: { fontSize: 28, fontWeight: "700" },
  line: { fontSize: 18 },
  result: { fontSize: 15, color: "#333" },
  back: { paddingHorizontal: 24, paddingTop: 16 },
  backText: { color: "#1f6feb", fontSize: 18 },
  button: {
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  outline: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  outlineText: { fontSize: 16 },
});
