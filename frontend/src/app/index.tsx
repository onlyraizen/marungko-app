import { UNITS, unitItems, type MatchResult, type Unit } from "@marungko/shared";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AwardsScreen from "../components/app/AwardsScreen";
import LogoutSheet from "../components/app/LogoutSheet";
import MoreSheet, { type MoreChoice } from "../components/app/MoreSheet";
import ProfileScreen from "../components/app/ProfileScreen";
import ReviewScreen from "../components/app/ReviewScreen";
import SettingsScreen from "../components/app/SettingsScreen";
import TabBar, { type TabId } from "../components/app/TabBar";
import AuthFlow from "../components/auth/AuthFlow";
import { DarkPage, SigningIn, darkStyles } from "../components/auth/dark";
import { Capi } from "../components/art/Capi";
import type { AvatarId } from "../components/art/assets";
import { buildBookViews } from "../components/book/books";
import PondPath from "../components/book/PondPath";
import Shelf from "../components/book/Shelf";
import ChildPicker from "../components/ChildPicker";
import LessonScreen, { type LessonSummary } from "../components/lesson/LessonScreen";
import LiveTranscript from "../components/LiveTranscript";
import MicSpike from "../components/MicSpike";
import Splash from "../components/Splash";
import Button3D from "../components/ui/Button3D";
import TopBar from "../components/ui/TopBar";
import { earnedMedals, type AwardStats } from "../content/awards";
import {
  completeUnit,
  createChild,
  getProgress,
  listChildren,
  recordAttempt,
  type Child,
  type UnitProgress,
} from "../services/progress";
import { supabase } from "../services/supabase";
import { useAppStore, useStoreHydrated } from "../store/useAppStore";
import { colors } from "../theme/colors";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const REVIEW_ROUND = 6;
const NO_WORDS: string[] = [];

type View_ = "main" | "lesson" | "review" | "settings" | "live" | "mic";

/** Sign in, choose the child, then the tabs: the shelf of books, review, awards and profile. */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const hydrated = useStoreHydrated();
  const activeChildId = useAppStore((state) => state.activeChildId);
  const setActiveChildId = useAppStore((state) => state.setActiveChildId);
  const unlockAll = useAppStore((state) => state.unlockAll);
  const setUnlockAll = useAppStore((state) => state.setUnlockAll);
  const slowGuide = useAppStore((state) => state.slowGuide);
  const setSlowGuide = useAppStore((state) => state.setSlowGuide);
  const missedByChild = useAppStore((state) => state.missed);
  const addMissed = useAppStore((state) => state.addMissed);
  const clearMissed = useAppStore((state) => state.clearMissed);
  const avatars = useAppStore((state) => state.avatars);
  const setAvatar = useAppStore((state) => state.setAvatar);
  const medalsByChild = useAppStore((state) => state.medals);
  const addMedals = useAppStore((state) => state.addMedals);

  const [kids, setKids] = useState<Child[] | null>(null);
  const [progress, setProgress] = useState<ReadonlyMap<string, UnitProgress>>(new Map());
  // Which child the loaded progress belongs to, so the path never shows another child's lessons.
  const [progressFor, setProgressFor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View_>("main");
  const [tab, setTab] = useState<TabId>("libro");
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [bookId, setBookId] = useState<string | null>(null);
  const [splashDone, setSplashDone] = useState(false);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [reviewWords, setReviewWords] = useState<string[]>(NO_WORDS);
  const [check, setCheck] = useState<string | null>(null);

  const userId = session?.user.id;

  // The splash shows for a moment on every launch, then the app takes over.
  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 1900);
    return () => clearTimeout(timer);
  }, []);

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
      setView("main");
      setTab("libro");
      setBookId(null);
      setLogoutOpen(false);
      setMoreOpen(false);
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

  const missed = (activeChild && missedByChild[activeChild.id]) || NO_WORDS;
  const avatar = ((activeChild && avatars[activeChild.id]) ?? "capi") as AvatarId;

  const books = useMemo(
    () => buildBookViews(UNITS, (unitId) => progress.has(unitId), unlockAll),
    [progress, unlockAll],
  );

  /** The numbers the medals are worked out from, as they stand now. */
  const stats = useMemo<AwardStats>(
    () => ({
      lessons: progress.size,
      perfect: [...progress.values()].some((row) => row.total > 0 && row.best_correct >= row.total),
      streak: activeChild?.streak_days ?? 0,
      xp: activeChild?.xp ?? 0,
      booksDone: buildBookViews(UNITS, (unitId) => progress.has(unitId), false)
        .filter((entry) => entry.status === "done")
        .map((entry) => entry.number),
    }),
    [progress, activeChild],
  );
  const earnedNow = useMemo(() => {
    const set = new Set<string>(earnedMedals(stats));
    for (const id of (activeChild && medalsByChild[activeChild.id]) || NO_WORDS) set.add(id);
    return set;
  }, [stats, activeChild, medalsByChild]);

  /** A word the child read or tapped: right takes it off the review list, wrong puts it on. */
  const markWord = useCallback(
    (word: string, ok: boolean) => {
      if (!activeChild) return;
      if (ok) clearMissed(activeChild.id, word);
      else addMissed(activeChild.id, word);
    },
    [activeChild, addMissed, clearMissed],
  );

  const handleAttempt = useCallback(
    (item: string, heard: string, kind: MatchResult["kind"]) => {
      if (!activeChild) return;
      if (unit && unit.words.includes(item)) markWord(item, kind === "correct");
      else if (view === "review") markWord(item, kind === "correct");
      if (view === "lesson" && unit) void recordAttempt({ childId: activeChild.id, unitId: unit.id, item, heard, kind });
    },
    [activeChild, unit, view, markWord],
  );

  const handleQuizAnswer = useCallback(
    (word: string, ok: boolean, heard: string, skipped: boolean) => {
      if (!activeChild) return;
      markWord(word, ok);
      if (view === "lesson" && unit) {
        void recordAttempt({
          childId: activeChild.id,
          unitId: unit.id,
          item: word,
          heard: skipped ? "[skipped]" : heard,
          kind: ok ? "correct" : "incorrect",
        });
      }
    },
    [activeChild, unit, view, markWord],
  );

  const handleNote = useCallback(
    (item: string, note: string) => {
      if (activeChild && unit && view === "lesson") {
        void recordAttempt({ childId: activeChild.id, unitId: unit.id, item, heard: `[${note}]`, kind: "incorrect" });
      }
    },
    [activeChild, unit, view],
  );

  const handleComplete = useCallback(
    async (correct: number, total: number): Promise<LessonSummary> => {
      if (!activeChild || !unit) throw new Error("No child or lesson selected.");
      const result = await completeUnit(activeChild.id, unit.id, correct, total);
      // Which medals did this lesson earn? Compare the numbers before and after.
      const finished = new Set(progress.keys());
      finished.add(unit.id);
      const after = earnedMedals({
        lessons: finished.size,
        perfect: stats.perfect || (total > 0 && correct >= total),
        streak: result.streak,
        xp: result.xp,
        booksDone: buildBookViews(UNITS, (unitId) => finished.has(unitId), false)
          .filter((entry) => entry.status === "done")
          .map((entry) => entry.number),
      });
      const held = new Set(earnedNow);
      const fresh = [...after].filter((id) => !held.has(id));
      addMedals(activeChild.id, [...after]);
      await refresh();
      return { ...result, medals: fresh };
    },
    [activeChild, unit, refresh, progress, stats, earnedNow, addMedals],
  );

  const handleCreateChild = useCallback(
    async (name: string, choice: AvatarId) => {
      const child = await createChild(name);
      setAvatar(child.id, choice);
      setKids((current) => [...(current ?? []), child]);
      setActiveChildId(child.id);
    },
    [setActiveChildId, setAvatar],
  );

  const signOut = useCallback(() => {
    setLogoutOpen(false);
    setActiveChildId(null);
    setView("main");
    void supabase.auth.signOut();
  }, [setActiveChildId]);

  const switchChild = useCallback(() => {
    setView("main");
    setTab("libro");
    setBookId(null);
    setActiveChildId(null);
  }, [setActiveChildId]);

  const startReview = () => {
    setReviewWords(missed.slice(0, REVIEW_ROUND));
    setView("review");
  };

  const chooseMore = (choice: MoreChoice) => {
    setMoreOpen(false);
    if (choice === "settings") setView("settings");
    else setTab(choice);
  };

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

  const openBook = books.find((entry) => entry.id === bookId) ?? null;

  if (!ready || !splashDone) {
    return <Splash />;
  }

  if (!session) {
    return <AuthFlow />;
  }

  if (loadError && kids === null) {
    return (
      <DarkPage>
        <View style={styles.errorBox}>
          <View style={styles.errorCapi}>
            <Capi pose={/network|fetch|internet|timeout/i.test(loadError) ? "noInternet" : "oops"} size={200} />
          </View>
          <Text style={darkStyles.title}>Hindi ma-load ang data</Text>
          <Text style={darkStyles.body}>{loadError}</Text>
          <Button3D label="Subukan ulit" onPress={() => void refresh()} />
          <Button3D label="Mag-log out" tone="outlineLight" onPress={signOut} />
        </View>
      </DarkPage>
    );
  }

  if (!hydrated || kids === null) {
    return <SigningIn />;
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

  const yuzu = Math.floor(activeChild.xp / 10);

  if (view === "lesson" && unit) {
    // Letter sounds have no recordings yet, so only syllables and words are spoken.
    const items = unitItems(unit).filter((item) => item.kind !== "sound").map((item) => item.text);
    return (
      <LessonScreen
        key={unit.id}
        title={unit.title}
        items={items}
        words={unit.words}
        baseYuzu={yuzu}
        onDone={() => setView("main")}
        onAttempt={handleAttempt}
        onQuizAnswer={handleQuizAnswer}
        onNote={handleNote}
        onComplete={handleComplete}
      />
    );
  }

  if (view === "review" && reviewWords.length > 0) {
    return (
      <LessonScreen
        key={`review:${reviewWords.join(",")}`}
        title="Balik-aral"
        items={reviewWords}
        words={reviewWords}
        baseYuzu={yuzu}
        review
        onDone={() => setView("main")}
        onAttempt={handleAttempt}
        onQuizAnswer={handleQuizAnswer}
      />
    );
  }

  if (view === "live" || view === "mic") {
    // Developer tools keep their plain look.
    return (
      <View style={[styles.legacy, { paddingTop: insets.top }]}>
        <Pressable style={styles.back} onPress={() => setView("settings")} accessibilityRole="button">
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        {view === "mic" ? <MicSpike /> : null}
        {view === "live" ? <LiveTranscript /> : null}
      </View>
    );
  }

  if (view === "settings") {
    return (
      <View style={styles.fill}>
        <SettingsScreen
          childName={activeChild.display_name}
          email={session.user.email ?? ""}
          slow={slowGuide}
          onSlow={setSlowGuide}
          unlockAll={unlockAll}
          onUnlockAll={setUnlockAll}
          check={check}
          onCheckBackend={() => void checkBackend()}
          onOpenLive={() => setView("live")}
          onOpenMic={() => setView("mic")}
          onSwitchChild={switchChild}
          onLogout={() => setLogoutOpen(true)}
          onClose={() => setView("main")}
        />
        {logoutOpen ? <LogoutSheet onStay={() => setLogoutOpen(false)} onLogout={signOut} /> : null}
      </View>
    );
  }

  const loaded = progressFor === activeChild.id;
  const inBook = tab === "libro" && openBook !== null && loaded;

  return (
    <View style={styles.fill}>
      <View style={styles.fill}>
        {tab === "libro" ? (
          <View style={styles.fill}>
            {!inBook ? (
              <TopBar
                name={activeChild.display_name}
                streak={activeChild.streak_days}
                yuzu={yuzu}
                avatar={avatar}
                onProfile={() => setTab("profile")}
              />
            ) : null}
            {!loaded ? (
              <SigningIn />
            ) : openBook ? (
              <PondPath
                key={`${activeChild.id}:${openBook.id}`}
                childId={activeChild.id}
                view={openBook}
                allUnits={UNITS}
                progress={progress}
                unlockAll={unlockAll}
                onBack={() => setBookId(null)}
                onStart={(selected) => {
                  setUnit(selected);
                  setView("lesson");
                }}
              />
            ) : (
              <Shelf books={books} onOpen={(entry) => setBookId(entry.id)} />
            )}
          </View>
        ) : null}
        {tab === "review" ? <ReviewScreen words={missed} onStart={startReview} /> : null}
        {tab === "awards" ? (
          <AwardsScreen earned={earnedNow} />
        ) : null}
        {tab === "profile" ? (
          <ProfileScreen
            name={activeChild.display_name}
            streak={activeChild.streak_days}
            yuzu={yuzu}
            xp={activeChild.xp}
            lessonsDone={progress.size}
            onSwitchChild={switchChild}
            avatar={avatar}
            onAvatar={(id) => setAvatar(activeChild.id, id)}
          />
        ) : null}
      </View>
      <TabBar
        active={moreOpen ? "more" : tab}
        reviewCount={missed.length}
        onSelect={(next) => {
          if (next === "more") {
            setMoreOpen(!moreOpen);
            return;
          }
          setMoreOpen(false);
          setTab(next);
        }}
      />
      {moreOpen ? <MoreSheet onChoose={chooseMore} onClose={() => setMoreOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  errorBox: { flex: 1, justifyContent: "center", gap: 14 },
  errorCapi: { alignItems: "center" },
  legacy: { flex: 1, backgroundColor: "#FFFFFF" },
  back: { paddingHorizontal: 24, paddingTop: 12 },
  backText: { color: "#1f6feb", fontSize: 18 },
});
