import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AppState = {
  /** Which child is using the app on this phone. Remembered between launches. */
  activeChildId: string | null;
  setActiveChildId: (id: string | null) => void;
  /** Demo switch: open every page and lesson regardless of progress. */
  unlockAll: boolean;
  setUnlockAll: (value: boolean) => void;
  /** The frog (lesson) each child's capybara last stood on, so it can hop forward next time. */
  petUnit: Record<string, string>;
  setPetUnit: (childId: string, unitId: string) => void;
  /** Slow mode: the guide voice plays slower so a child can hear each sound. */
  slowGuide: boolean;
  setSlowGuide: (value: boolean) => void;
  /** Words each child missed, for "Balik-aral" (review). Cleared word by word as they get them right. */
  missed: Record<string, string[]>;
  addMissed: (childId: string, word: string) => void;
  clearMissed: (childId: string, word: string) => void;
  /** The avatar each child picked (kept on this phone). */
  avatars: Record<string, string>;
  setAvatar: (childId: string, avatar: string) => void;
  /** Medals each child has earned (kept on this phone). */
  medals: Record<string, string[]>;
  addMedals: (childId: string, ids: readonly string[]) => void;
  /** Short screen transitions (book opening, lesson start). Can be switched off on slow phones. */
  animations: boolean;
  setAnimations: (value: boolean) => void;
  /** The day (YYYY-MM-DD) each child was last told their streak ended, so Capi says it only once. */
  streakNotice: Record<string, string>;
  setStreakNotice: (childId: string, day: string) => void;
  /** The one-tap microphone tutorial has been shown once. */
  seenMicTutorial: boolean;
  setSeenMicTutorial: (value: boolean) => void;
  /** Emails that have signed in on this phone, for the "Maligayang pagbabalik" list. Never passwords. */
  savedAccounts: string[];
  rememberAccount: (email: string) => void;
  forgetAccount: (email: string) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeChildId: null,
      setActiveChildId: (id) => set({ activeChildId: id }),
      unlockAll: false,
      setUnlockAll: (value) => set({ unlockAll: value }),
      slowGuide: false,
      setSlowGuide: (value) => set({ slowGuide: value }),
      missed: {},
      addMissed: (childId, word) =>
        set((state) => {
          const list = state.missed[childId] ?? [];
          return list.includes(word) ? state : { missed: { ...state.missed, [childId]: [...list, word] } };
        }),
      clearMissed: (childId, word) =>
        set((state) => {
          const list = state.missed[childId] ?? [];
          return list.includes(word) ? { missed: { ...state.missed, [childId]: list.filter((w) => w !== word) } } : state;
        }),
      avatars: {},
      setAvatar: (childId, avatar) => set((state) => ({ avatars: { ...state.avatars, [childId]: avatar } })),
      medals: {},
      addMedals: (childId, ids) =>
        set((state) => {
          const have = new Set(state.medals[childId] ?? []);
          const fresh = ids.filter((id) => !have.has(id));
          return fresh.length === 0 ? state : { medals: { ...state.medals, [childId]: [...have, ...fresh] } };
        }),
      streakNotice: {},
      setStreakNotice: (childId, day) => set((state) => ({ streakNotice: { ...state.streakNotice, [childId]: day } })),
      animations: true,
      setAnimations: (value) => set({ animations: value }),
      seenMicTutorial: false,
      setSeenMicTutorial: (value) => set({ seenMicTutorial: value }),
      savedAccounts: [],
      rememberAccount: (email) =>
        set((state) => (state.savedAccounts.includes(email) ? state : { savedAccounts: [email, ...state.savedAccounts].slice(0, 5) })),
      forgetAccount: (email) => set((state) => ({ savedAccounts: state.savedAccounts.filter((e) => e !== email) })),
      petUnit: {},
      setPetUnit: (childId, unitId) =>
        set((state) => (state.petUnit[childId] === unitId ? state : { petUnit: { ...state.petUnit, [childId]: unitId } })),
    }),
    { name: "marungko-app-state", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** True once the remembered state has been read from the phone's storage. */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  useEffect(() => {
    const unsubscribe = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAppStore.persist.hasHydrated());
    return unsubscribe;
  }, []);
  return hydrated;
}
