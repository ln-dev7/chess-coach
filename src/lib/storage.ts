"use client";

import {
  DEFAULT_SETTINGS,
  purgeLegacyKeys,
  type StoredAiKey,
  useStore,
} from "./store";
import type { AiProviderId } from "./providers";
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
 * Imperative facade over the Zustand store (see store.ts). Same signatures as
 * before so non-reactive callers (sync, analysis, generators, handlers) need no
 * changes; components that render data subscribe with the selector hooks from
 * store.ts instead. Persistence is handled by the store.
 */

export { DEFAULT_SETTINGS };
export type { StoredAiKey };

const st = () => useStore.getState();

// ---------- Settings ----------
export function loadSettings(): Settings {
  return st().settings;
}
export function saveSettings(s: Settings): void {
  st().setSettings(s);
}

// ---------- Games ----------
export function loadGames(): GameRow[] {
  return st().games;
}
export function saveGames(games: GameRow[]): void {
  st().setGames(games);
}
/** Merge new games, dedupe by id, newest first. Returns number inserted. */
export function upsertGames(incoming: GameRow[]): number {
  return st().upsertGames(incoming);
}
export function setGameStatus(
  gameId: string,
  status: GameRow["analysis_status"],
  accuracy?: number | null
): void {
  st().setGameStatus(gameId, status, accuracy);
}

// ---------- Analyses ----------
export function loadAnalyses(): Record<string, AnalysisSummary> {
  return st().analyses;
}
export function saveAnalysis(gameId: string, summary: AnalysisSummary): void {
  st().setAnalysis(gameId, summary);
}

// ---------- Puzzles ----------
export function loadPuzzles(): PuzzleRow[] {
  return st().puzzles;
}
export function upsertPuzzles(incoming: PuzzleRow[]): void {
  st().upsertPuzzles(incoming);
}
export function updatePuzzle(id: string, patch: Partial<Pick<PuzzleRow, "attempts" | "solved">>): void {
  st().updatePuzzle(id, patch);
}

// ---------- Lessons ----------
export function loadLessons(): GeneratedLesson[] {
  return st().lessons;
}
export function saveLessons(lessons: GeneratedLesson[]): void {
  st().setLessons(lessons);
}
export function setLessonCompleted(slug: string, completed: boolean): void {
  st().setLessonCompletedAction(slug, completed);
}
export function removeLesson(slug: string): void {
  st().removeLessonAction(slug);
}

// ---------- AI lessons ----------
export function loadAiLessons(): AiLessonRow[] {
  return st().aiLessons;
}
export function addAiLesson(lesson: AiLessonRow): void {
  st().addAiLessonAction(lesson);
}
export function setAiLessonCompleted(id: string, completed: boolean): void {
  st().setAiLessonCompletedAction(id, completed);
}
export function removeAiLesson(id: string): void {
  st().removeAiLessonAction(id);
}

// ---------- Masters: cached AI annotations per game+locale ----------
export function loadMasterAnnotations(): MasterAnnotation[] {
  return st().masterAnnotations;
}
export function addMasterAnnotation(annotation: MasterAnnotation): void {
  st().addMasterAnnotationAction(annotation);
}
export function removeMasterAnnotation(gameId: string, locale: "en" | "fr"): void {
  st().removeMasterAnnotationAction(gameId, locale);
}

// ---------- Onboarding ----------
export function isOnboarded(): boolean {
  const s = st();
  if (!s.hydrated) return true; // never flash the modal before we've read storage
  return s.onboardedFlag || Boolean(s.settings.chesscomUsername || s.settings.lichessUsername);
}
export function setOnboarded(): void {
  st().setOnboardedFlag();
}

// ---------- User AI provider API key (BYOK) ----------
// Stored in THIS browser only, together with the chosen provider. It is sent
// directly from the browser to that provider — it never reaches this app's
// server and is never stored anywhere else.
export function loadAiKey(): StoredAiKey | null {
  return st().apiKey;
}
export function saveAiKey(provider: AiProviderId, key: string): void {
  st().setApiKeyAction(provider, key);
}
export function clearAiKey(): void {
  st().clearApiKeyAction();
}

// ---------- Maintenance ----------
export function clearAllData(): void {
  st().clearAllAction();
  purgeLegacyKeys();
}
