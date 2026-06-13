"use client";

import { fetchChesscomGames } from "./fetchers/chesscom";
import { fetchLichessGames } from "./fetchers/lichess";
import { loadSettings, upsertGames } from "./storage";
import type { Settings } from "./types";

export interface SyncResult {
  inserted: number;
  chesscom: number;
  lichess: number;
}

/** Thrown when neither platform username is set. */
export class NoUsernamesError extends Error {}

/**
 * Fetch recent games from the configured platforms and merge them into the
 * store. Reads usernames from settings unless `override` is passed — onboarding
 * uses the override so it can sync before its inputs round-trip through the store.
 */
export async function syncGames(
  override?: Partial<Pick<Settings, "chesscomUsername" | "lichessUsername" | "analyzeLastN">>
): Promise<SyncResult> {
  const base = loadSettings();
  const chesscomUsername = (override?.chesscomUsername ?? base.chesscomUsername).trim();
  const lichessUsername = (override?.lichessUsername ?? base.lichessUsername).trim();
  if (!chesscomUsername && !lichessUsername) throw new NoUsernamesError();

  const analyzeLastN = override?.analyzeLastN ?? base.analyzeLastN;
  const maxGames = Math.max(analyzeLastN * 2, 200);
  const [chesscom, lichess] = await Promise.all([
    chesscomUsername ? fetchChesscomGames(chesscomUsername, maxGames) : Promise.resolve([]),
    lichessUsername ? fetchLichessGames(lichessUsername, maxGames) : Promise.resolve([]),
  ]);
  const inserted = upsertGames([...chesscom, ...lichess]);
  return { inserted, chesscom: chesscom.length, lichess: lichess.length };
}
