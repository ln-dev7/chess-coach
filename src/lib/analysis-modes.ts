import type { AnalysisMode, Settings } from "./types";

/**
 * Analysis depth presets. The whole pipeline (blunder detection, accuracy,
 * coach dossier) only ever sees the per-position engine eval, so eval quality
 * is gated by how long Stockfish thinks per move. Two presets:
 *
 *   - "fast": the user's configurable `engineMovetimeMs` (default 90ms).
 *     ~5–10s per game. Good for a first sweep over many games.
 *   - "deep": a fixed, much longer think (DEEP_MOVETIME_MS) plus a bigger
 *     transposition table. ~6× slower but far more reliable evals — fewer
 *     misclassified blunders and sharper key positions for the AI coach.
 *
 * Movetime (not fixed depth) keeps each position's cost predictable so the
 * progress bar stays honest even in sharp tactical middlegames.
 */

/** Think time per position in deep mode (ms). */
export const DEEP_MOVETIME_MS = 500;

const FAST_HASH_MB = 32;
const DEEP_HASH_MB = 64;
/** Floor for the fast preset, mirroring the Settings input bounds. */
const FAST_MIN_MOVETIME_MS = 40;
const FAST_DEFAULT_MOVETIME_MS = 90;

export interface AnalysisParams {
  mode: AnalysisMode;
  /** Engine think time per position (ms). */
  movetimeMs: number;
  /** Transposition-table size passed to the engine (MB). */
  hashMb: number;
  /** Human-readable label stored on the analysis summary (engineDepthOrTime). */
  label: string;
}

/** Resolve the engine parameters for a given mode, reading the fast time from settings. */
export function resolveAnalysisParams(settings: Settings, mode: AnalysisMode): AnalysisParams {
  if (mode === "deep") {
    return {
      mode,
      movetimeMs: DEEP_MOVETIME_MS,
      hashMb: DEEP_HASH_MB,
      label: `deep · movetime ${DEEP_MOVETIME_MS}ms`,
    };
  }
  const movetimeMs = Math.max(FAST_MIN_MOVETIME_MS, settings.engineMovetimeMs || FAST_DEFAULT_MOVETIME_MS);
  return {
    mode: "fast",
    movetimeMs,
    hashMb: FAST_HASH_MB,
    label: `fast · movetime ${movetimeMs}ms`,
  };
}

/** The default mode saved in settings, falling back to "fast". */
export function defaultMode(settings: Settings): AnalysisMode {
  return settings.analysisMode ?? "fast";
}
