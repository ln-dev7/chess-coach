"use client";

import type { AiLessonRow, AnalysisSummary, GameRow, GeneratedLesson, PuzzleRow, Settings } from "./types";

/**
 * MVP persistence: everything lives in this browser's localStorage.
 * No account, no server, no database. See docs/POST-MVP-GUIDE.md for the
 * planned migration path (IndexedDB → hosted DB + auth).
 */
const KEYS = {
  settings: "cc:settings",
  games: "cc:games",
  analyses: "cc:analyses",
  puzzles: "cc:puzzles",
  lessons: "cc:lessons",
  aiLessons: "cc:aiLessons",
  apiKey: "cc:apiKey",
  onboarded: "cc:onboarded",
} as const;

const isBrowser = typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Settings ----------

export const DEFAULT_SETTINGS: Settings = {
  chesscomUsername: "",
  lichessUsername: "",
  analyzeLastN: 50,
  engineMovetimeMs: 90,
  boardTheme: "classic",
};

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) };
}

export function saveSettings(s: Settings): void {
  write(KEYS.settings, s);
}

// ---------- Games ----------

export function loadGames(): GameRow[] {
  return read<GameRow[]>(KEYS.games, []);
}

export function saveGames(games: GameRow[]): void {
  write(KEYS.games, games);
}

/** Merge new games, dedupe by id, newest first. Returns number inserted. */
export function upsertGames(incoming: GameRow[]): number {
  const existing = loadGames();
  const seen = new Set(existing.map((g) => g.id));
  const fresh = incoming.filter((g) => !seen.has(g.id));
  if (fresh.length) {
    const all = [...existing, ...fresh].sort(
      (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    );
    saveGames(all);
  }
  return fresh.length;
}

export function setGameStatus(gameId: string, status: GameRow["analysis_status"], accuracy?: number | null): void {
  const games = loadGames();
  const g = games.find((x) => x.id === gameId);
  if (!g) return;
  g.analysis_status = status;
  if (accuracy != null && g.accuracy_user == null) g.accuracy_user = accuracy;
  saveGames(games);
}

// ---------- Analyses ----------

export function loadAnalyses(): Record<string, AnalysisSummary> {
  return read<Record<string, AnalysisSummary>>(KEYS.analyses, {});
}

export function saveAnalysis(gameId: string, summary: AnalysisSummary): void {
  const all = loadAnalyses();
  all[gameId] = summary;
  write(KEYS.analyses, all);
}

// ---------- Puzzles ----------

export function loadPuzzles(): PuzzleRow[] {
  return read<PuzzleRow[]>(KEYS.puzzles, []);
}

export function upsertPuzzles(incoming: PuzzleRow[]): void {
  const existing = loadPuzzles();
  const seen = new Set(existing.map((p) => p.id));
  const fresh = incoming.filter((p) => !seen.has(p.id));
  if (fresh.length) write(KEYS.puzzles, [...fresh, ...existing]);
}

export function updatePuzzle(id: string, patch: Partial<Pick<PuzzleRow, "attempts" | "solved">>): void {
  const puzzles = loadPuzzles();
  const p = puzzles.find((x) => x.id === id);
  if (!p) return;
  Object.assign(p, patch);
  write(KEYS.puzzles, puzzles);
}

// ---------- Lessons ----------

export function loadLessons(): GeneratedLesson[] {
  return read<GeneratedLesson[]>(KEYS.lessons, []);
}

export function saveLessons(lessons: GeneratedLesson[]): void {
  write(KEYS.lessons, lessons);
}

export function setLessonCompleted(slug: string, completed: boolean): void {
  const lessons = loadLessons();
  const l = lessons.find((x) => x.slug === slug);
  if (!l) return;
  l.completed = completed;
  saveLessons(lessons);
}

export function removeLesson(slug: string): void {
  saveLessons(loadLessons().filter((l) => l.slug !== slug));
}

// ---------- AI lessons ----------

export function loadAiLessons(): AiLessonRow[] {
  return read<AiLessonRow[]>(KEYS.aiLessons, []);
}

export function addAiLesson(lesson: AiLessonRow): void {
  write(KEYS.aiLessons, [lesson, ...loadAiLessons()]);
}

export function setAiLessonCompleted(id: string, completed: boolean): void {
  const lessons = loadAiLessons();
  const l = lessons.find((x) => x.id === id);
  if (!l) return;
  l.completed = completed;
  write(KEYS.aiLessons, lessons);
}

export function removeAiLesson(id: string): void {
  write(KEYS.aiLessons, loadAiLessons().filter((l) => l.id !== id));
}

// ---------- Onboarding ----------

export function isOnboarded(): boolean {
  if (!isBrowser) return true; // never flash the modal during SSR
  if (localStorage.getItem(KEYS.onboarded) === "1") return true;
  const s = loadSettings();
  return Boolean(s.chesscomUsername || s.lichessUsername);
}

export function setOnboarded(): void {
  if (isBrowser) localStorage.setItem(KEYS.onboarded, "1");
}

// ---------- User Anthropic API key (BYOK) ----------
// Stored in THIS browser only. It is sent directly from the browser to
// api.anthropic.com — it never reaches this app's server and is never stored
// anywhere else.

export function loadApiKey(): string {
  if (!isBrowser) return "";
  return localStorage.getItem(KEYS.apiKey) ?? "";
}

export function saveApiKey(key: string): void {
  if (!isBrowser) return;
  if (key.trim()) localStorage.setItem(KEYS.apiKey, key.trim());
  else localStorage.removeItem(KEYS.apiKey);
}

export function clearApiKey(): void {
  if (isBrowser) localStorage.removeItem(KEYS.apiKey);
}

// ---------- Maintenance ----------

export function clearAllData(): void {
  if (!isBrowser) return;
  for (const key of Object.values(KEYS)) localStorage.removeItem(key);
}
