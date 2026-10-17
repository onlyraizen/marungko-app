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
