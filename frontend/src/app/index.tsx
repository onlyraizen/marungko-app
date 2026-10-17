import { UNITS, unitItems, type MatchResult, type Unit } from "@marungko/shared";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Book from "../components/book/Book";
import ChildPicker from "../components/ChildPicker";
import LiveTranscript from "../components/LiveTranscript";
import MicSpike from "../components/MicSpike";
import ProfileMenu from "../components/ProfileMenu";
import SignIn from "../components/SignIn";
import Button3D from "../components/ui/Button3D";
import TopBar from "../components/ui/TopBar";
import WordExercise from "../components/WordExercise";
import {
  completeUnit,
  createChild,
  getProgress,
  listChildren,
  recordAttempt,
  type Child,
  type CompleteResult,
  type UnitProgress,
} from "../services/progress";
import { supabase } from "../services/supabase";
import { useAppStore, useStoreHydrated } from "../store/useAppStore";
import { colors } from "../theme/colors";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type Screen = "path" | "menu" | "practice" | "live" | "mic";

/** Sign in, choose the child, then the storybook with saved progress. */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const hydrated = useStoreHydrated();
  const activeChildId = useAppStore((state) => state.activeChildId);
  const setActiveChildId = useAppStore((state) => state.setActiveChildId);
  const unlockAll = useAppStore((state) => state.unlockAll);
  const setUnlockAll = useAppStore((state) => state.setUnlockAll);

  const [kids, setKids] = useState<Child[] | null>(null);
  const [progress, setProgress] = useState<ReadonlyMap<string, UnitProgress>>(new Map());
  // Which child the loaded progress belongs to, so the book never shows another child's pages.
  const [progressFor, setProgressFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("path");
  const [unit, setUnit] = useState<Unit | null>(null);
  const [check, setCheck] = useState<string | null>(null);

  const userId = session?.user.id;
  const activeChild = useMemo(
    () => kids?.find((kid) => kid.id === activeChildId) ?? null,
    [kids, activeChildId],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  // Signed out: forget the child and the loaded data.
  useEffect(() => {
    if (ready && !userId) {
      setKids(null);
      setProgress(new Map());
      setProgressFor(null);
      setActiveChildId(null);
      setScreen("path");
    }
  }, [ready, userId, setActiveChildId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const list = await listChildren();
      const chosen = list.find((kid) => kid.id === useAppStore.getState().activeChildId);
      const rows = chosen ? await getProgress(chosen.id) : [];
      setKids(list);
      setProgress(new Map(rows.map((row) => [row.unit_id, row])));
      setProgressFor(chosen?.id ?? null);
      setLoadError(null);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh, activeChildId]);

  const handleAttempt = useCallback(
    (item: string, heard: string, kind: MatchResult["kind"]) => {
      if (activeChild && unit) void recordAttempt({ childId: activeChild.id, unitId: unit.id, item, heard, kind });
    },
    [activeChild, unit],
  );

  const handleComplete = useCallback(
    async (correct: number, total: number): Promise<CompleteResult> => {
      if (!activeChild || !unit) throw new Error("No child or lesson selected.");
      const result = await completeUnit(activeChild.id, unit.id, correct, total);
      await refresh();
      return result;
    },
    [activeChild, unit, refresh],
  );

  const handleCreateChild = useCallback(
    async (name: string) => {
      const child = await createChild(name);
      setKids((current) => [...(current ?? []), child]);
      setActiveChildId(child.id);
    },
    [setActiveChildId],
  );

  const signOut = useCallback(() => {
    setActiveChildId(null);
    setScreen("path");
    void supabase.auth.signOut();
  }, [setActiveChildId]);

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
    return <ActivityIndicator style={styles.loading} color={colors.primary} />;
  }

  if (!session) {
    return <SignIn />;
  }

  if (loadError && kids === null) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.errorTitle}>Hindi ma-load ang data</Text>
        <Text style={styles.errorText}>{loadError}</Text>
        <Button3D label="Subukan ulit" onPress={() => void refresh()} />
        <Button3D label="Sign out" tone="neutral" onPress={signOut} />
      </View>
    );
  }

  if (!hydrated || kids === null) {
    return <ActivityIndicator style={styles.loading} color={colors.primary} />;
  }

  if (!activeChild) {
    return (
      <ChildPicker
        kids={kids}
        onSelect={(child) => setActiveChildId(child.id)}
        onCreate={handleCreateChild}
        onSignOut={signOut}
      />
    );
  }

  if (screen === "menu") {
    return (
      <ProfileMenu
        childName={activeChild.display_name}
        email={session.user.email ?? ""}
        unlockAll={unlockAll}
        check={check}
        onToggleUnlock={() => setUnlockAll(!unlockAll)}
        onSwitchChild={() => {
          setScreen("path");
          setActiveChildId(null);
        }}
        onCheckBackend={() => void checkBackend()}
        onOpenLive={() => setScreen("live")}
        onOpenMic={() => setScreen("mic")}
        onSignOut={signOut}
        onClose={() => setScreen("path")}
      />
    );
  }

  if (screen === "practice" || screen === "live" || screen === "mic") {
    // Letter sounds have no recordings yet, so only syllables and words are spoken.
    const items = unit ? unitItems(unit).filter((item) => item.kind !== "sound").map((item) => item.text) : [];
    return (
      // The lesson screens still have the light look until the lesson-screen batch restyles them.
      <View style={[styles.legacy, { paddingTop: insets.top }]}>
        <Pressable
          style={styles.back}
          onPress={() => setScreen(screen === "practice" ? "path" : "menu")}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        {screen === "mic" ? <MicSpike /> : null}
        {screen === "live" ? <LiveTranscript /> : null}
        {screen === "practice" && unit ? (
          <WordExercise
            key={unit.id}
            title={unit.title}
            items={items}
            onDone={() => setScreen("path")}
            onAttempt={handleAttempt}
            onComplete={handleComplete}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopBar
        name={activeChild.display_name}
        streak={activeChild.streak_days}
        xp={activeChild.xp}
        onPress={() => setScreen("menu")}
      />
      {progressFor === activeChild.id ? (
        <Book
          key={activeChild.id}
          childId={activeChild.id}
          units={UNITS}
          progress={progress}
          unlockAll={unlockAll}
          onStart={(selected) => {
            setUnit(selected);
            setScreen("practice");
          }}
        />
      ) : (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { marginTop: 120 },
  centered: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, gap: 14 },
  errorTitle: { color: colors.text, fontSize: 26, fontWeight: "800" },
  errorText: { color: colors.muted, fontSize: 15 },
  legacy: { flex: 1, backgroundColor: "#FFFFFF" },
  back: { paddingHorizontal: 24, paddingTop: 12 },
  backText: { color: "#1f6feb", fontSize: 18 },
});
