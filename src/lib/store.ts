"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type AiProviderId, isProviderId } from "./providers";
import type {
  AiLessonRow,
  AnalysisSummary,
  GameRow,
  GeneratedLesson,
  MasterAnnotation,
  PuzzleRow,
  Settings,
} from "./types";

/**
 * Single source of truth for all local data — a Zustand store persisted to
 * localStorage. Components subscribe with the selector hooks below, so any
 * mutation propagates everywhere with no manual refresh callbacks or reloads.
 *
 * The on-disk format is one JSON blob under `cc:store`. Data written by earlier
 * versions (separate `cc:*` keys) is imported once in `hydrateStore()`.
 *
 * See docs/POST-MVP-GUIDE.md: to move to IndexedDB later, swap `storage` below
 * for a custom adapter — components and storage.ts stay unchanged.
 */

export const STORE_KEY = "cc:store";

export const DEFAULT_SETTINGS: Settings = {
  chesscomUsername: "",
  lichessUsername: "",
  analyzeLastN: 50,
  engineMovetimeMs: 90,
  analysisMode: "fast",
  boardTheme: "classic",
  soundEnabled: true,
  voiceEnabled: true,
};

export interface StoredAiKey {
  provider: AiProviderId;
  key: string;
}

interface PersistedState {
  settings: Settings;
  games: GameRow[];
  analyses: Record<string, AnalysisSummary>;
  puzzles: PuzzleRow[];
  lessons: GeneratedLesson[];
  aiLessons: AiLessonRow[];
  masterAnnotations: MasterAnnotation[];
  apiKey: StoredAiKey | null;
  onboardedFlag: boolean;
}

interface StoreState extends PersistedState {
  /** false until the persisted state has been read back from localStorage. */
  hydrated: boolean;

  setSettings: (settings: Settings) => void;
  setGames: (games: GameRow[]) => void;
  upsertGames: (incoming: GameRow[]) => number;
  setGameStatus: (id: string, status: GameRow["analysis_status"], accuracy?: number | null) => void;
  setAnalysis: (id: string, summary: AnalysisSummary) => void;
  upsertPuzzles: (incoming: PuzzleRow[]) => void;
  updatePuzzle: (id: string, patch: Partial<Pick<PuzzleRow, "attempts" | "solved">>) => void;
  setLessons: (lessons: GeneratedLesson[]) => void;
  setLessonCompletedAction: (slug: string, completed: boolean) => void;
  removeLessonAction: (slug: string) => void;
  addAiLessonAction: (lesson: AiLessonRow) => void;
  setAiLessonCompletedAction: (id: string, completed: boolean) => void;
  removeAiLessonAction: (id: string) => void;
  addMasterAnnotationAction: (annotation: MasterAnnotation) => void;
  removeMasterAnnotationAction: (gameId: string, locale: "en" | "fr") => void;
  setOnboardedFlag: () => void;
  setApiKeyAction: (provider: AiProviderId, key: string) => void;
  clearApiKeyAction: () => void;
  clearAllAction: () => void;
}

const initialPersisted: PersistedState = {
  settings: DEFAULT_SETTINGS,
  games: [],
  analyses: {},
  puzzles: [],
  lessons: [],
  aiLessons: [],
  masterAnnotations: [],
  apiKey: null,
  onboardedFlag: false,
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initialPersisted,
      hydrated: false,

      setSettings: (settings) => set({ settings }),

      setGames: (games) => set({ games }),

      upsertGames: (incoming) => {
        const existing = get().games;
        const seen = new Set(existing.map((g) => g.id));
        const fresh = incoming.filter((g) => !seen.has(g.id));
        if (fresh.length) {
          const all = [...existing, ...fresh].sort(
            (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
          );
          set({ games: all });
        }
        return fresh.length;
      },

      setGameStatus: (id, status, accuracy) =>
        set({
          games: get().games.map((g) => {
            if (g.id !== id) return g;
            const next: GameRow = { ...g, analysis_status: status };
            if (accuracy != null && g.accuracy_user == null) next.accuracy_user = accuracy;
            return next;
          }),
        }),

      setAnalysis: (id, summary) => set({ analyses: { ...get().analyses, [id]: summary } }),

      upsertPuzzles: (incoming) => {
        const existing = get().puzzles;
        const seen = new Set(existing.map((p) => p.id));
        const fresh = incoming.filter((p) => !seen.has(p.id));
        if (fresh.length) set({ puzzles: [...fresh, ...existing] });
      },

      updatePuzzle: (id, patch) =>
        set({ puzzles: get().puzzles.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),

      setLessons: (lessons) => set({ lessons }),

      setLessonCompletedAction: (slug, completed) =>
        set({ lessons: get().lessons.map((l) => (l.slug === slug ? { ...l, completed } : l)) }),

      removeLessonAction: (slug) => set({ lessons: get().lessons.filter((l) => l.slug !== slug) }),

      addAiLessonAction: (lesson) => set({ aiLessons: [lesson, ...get().aiLessons] }),

      setAiLessonCompletedAction: (id, completed) =>
        set({ aiLessons: get().aiLessons.map((l) => (l.id === id ? { ...l, completed } : l)) }),

      removeAiLessonAction: (id) => set({ aiLessons: get().aiLessons.filter((l) => l.id !== id) }),

      addMasterAnnotationAction: (annotation) =>
        set({
          masterAnnotations: [
            annotation,
            // replace any existing annotation for the same game+locale
            ...get().masterAnnotations.filter(
              (a) => !(a.gameId === annotation.gameId && a.locale === annotation.locale)
            ),
          ],
        }),

      removeMasterAnnotationAction: (gameId, locale) =>
        set({
          masterAnnotations: get().masterAnnotations.filter(
            (a) => !(a.gameId === gameId && a.locale === locale)
          ),
        }),

      setOnboardedFlag: () => set({ onboardedFlag: true }),

      setApiKeyAction: (provider, key) => {
        const k = key.trim();
        set({ apiKey: k ? { provider, key: k } : null });
      },

      clearApiKeyAction: () => set({ apiKey: null }),

      clearAllAction: () => set({ ...initialPersisted }),
    }),
    {
      name: STORE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({
        settings,
        games,
        analyses,
        puzzles,
        lessons,
        aiLessons,
        masterAnnotations,
        apiKey,
        onboardedFlag,
      }) => ({
        settings,
        games,
        analyses,
        puzzles,
        lessons,
        aiLessons,
        masterAnnotations,
        apiKey,
        onboardedFlag,
      }),
      // Hydrate explicitly after mount (see hydrateStore) so SSR and the first
      // client render agree, and the persisted read never lands inside an effect.
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    }
  )
);

// ---------- Selector hooks (reactive reads for components) ----------

export const useSettings = () => useStore((s) => s.settings);
export const useGames = () => useStore((s) => s.games);
export const useAnalyses = () => useStore((s) => s.analyses);
export const useLessons = () => useStore((s) => s.lessons);
export const useAiLessons = () => useStore((s) => s.aiLessons);
export const useMasterAnnotations = () => useStore((s) => s.masterAnnotations);
export const useApiKey = () => useStore((s) => s.apiKey);
export const useOnboardedFlag = () => useStore((s) => s.onboardedFlag);
export const useStoreHydrated = () => useStore((s) => s.hydrated);

// ---------- Legacy migration (separate cc:* keys → single cc:store) ----------

const LEGACY_KEYS = {
  settings: "cc:settings",
  games: "cc:games",
  analyses: "cc:analyses",
  puzzles: "cc:puzzles",
  lessons: "cc:lessons",
  aiLessons: "cc:aiLessons",
  apiKey: "cc:apiKey",
  onboarded: "cc:onboarded",
} as const;

export const LEGACY_KEY_LIST = Object.values(LEGACY_KEYS);

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readLegacyApiKey(): StoredAiKey | null {
  const raw = localStorage.getItem(LEGACY_KEYS.apiKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") {
      const k = parsed.trim();
      return k ? { provider: "anthropic", key: k } : null;
    }
    if (parsed && typeof parsed === "object") {
      const obj = parsed as { provider?: unknown; key?: unknown };
      const key = typeof obj.key === "string" ? obj.key.trim() : "";
      if (!key) return null;
      return { provider: isProviderId(obj.provider) ? obj.provider : "anthropic", key };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function readLegacy(): PersistedState | null {
  const hasAny = LEGACY_KEY_LIST.some((k) => localStorage.getItem(k) != null);
  if (!hasAny) return null;
  return {
    settings: { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(LEGACY_KEYS.settings, {}) },
    games: readJSON<GameRow[]>(LEGACY_KEYS.games, []),
    analyses: readJSON<Record<string, AnalysisSummary>>(LEGACY_KEYS.analyses, {}),
    puzzles: readJSON<PuzzleRow[]>(LEGACY_KEYS.puzzles, []),
    lessons: readJSON<GeneratedLesson[]>(LEGACY_KEYS.lessons, []),
    aiLessons: readJSON<AiLessonRow[]>(LEGACY_KEYS.aiLessons, []),
    masterAnnotations: [], // never existed in the legacy per-key layout
    apiKey: readLegacyApiKey(),
    onboardedFlag: localStorage.getItem(LEGACY_KEYS.onboarded) === "1",
  };
}

/**
 * Read persisted state into the store. Call once, from the client after mount.
 * Migrates any pre-existing `cc:*` data into the new `cc:store` blob first.
 */
export function hydrateStore(): void {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(STORE_KEY)) {
    const migrated = readLegacy();
    if (migrated) {
      localStorage.setItem(STORE_KEY, JSON.stringify({ state: migrated, version: 1 }));
    }
  }
  void useStore.persist.rehydrate();
}

/** Remove the legacy per-slice keys (used by the full wipe). */
export function purgeLegacyKeys(): void {
  if (typeof window === "undefined") return;
  for (const k of LEGACY_KEY_LIST) localStorage.removeItem(k);
}
