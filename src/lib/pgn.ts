import { Chess } from "chess.js";
import type { GameResult, TimeClass } from "./types";

export interface ParsedGame {
  headers: Record<string, string>;
  fens: string[]; // fens[i] = position before move i (ply i, 0-based); last entry = final position
  moves: { san: string; uci: string; color: "w" | "b" }[];
}

export function parsePgn(pgn: string): ParsedGame | null {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn, { strict: false });
    const headers = chess.getHeaders ? chess.getHeaders() : {};
    const verbose = chess.history({ verbose: true });
    const replay = new Chess(headers["FEN"] || undefined);
    const fens: string[] = [replay.fen()];
    const moves = verbose.map((m) => {
      replay.move(m.san);
      fens.push(replay.fen());
      return {
        san: m.san,
        uci: m.from + m.to + (m.promotion ?? ""),
        color: m.color as "w" | "b",
      };
    });
    return { headers, fens, moves };
  } catch {
    return null;
  }
}

export function resultForUser(pgnResult: string, userColor: "w" | "b"): GameResult {
  if (pgnResult === "1/2-1/2") return "draw";
  if (pgnResult === "1-0") return userColor === "w" ? "win" : "loss";
  if (pgnResult === "0-1") return userColor === "b" ? "win" : "loss";
  return "draw";
}

export function normalizeTimeClass(tc: string): TimeClass {
  const known: TimeClass[] = ["bullet", "blitz", "rapid", "daily", "classical", "correspondence"];
  return (known.includes(tc as TimeClass) ? tc : "rapid") as TimeClass;
}

/** Estimate time class from a lichess "speed" or clock. */
export function lichessSpeedToTimeClass(speed: string): TimeClass {
  if (speed === "ultraBullet") return "bullet";
  return normalizeTimeClass(speed);
}

/**
 * Extract remaining clock time (seconds) per ply from PGN %clk comments
 * (chess.com always includes them). clocks[i] = time left AFTER ply i+1 was played.
 * Returns null if the PGN has no clock data.
 */
export function extractClocks(pgn: string): number[] | null {
  const matches = [...pgn.matchAll(/\[%clk\s+(\d+):(\d+):(\d+(?:\.\d+)?)\]/g)];
  if (!matches.length) return null;
  return matches.map((m) => Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
}

/** Base time in seconds from a TimeControl header like "600", "600+5", "1/86400". */
export function parseBaseTime(timeControl?: string | null): number | null {
  if (!timeControl) return null;
  if (timeControl.includes("/")) return null; // daily/correspondence
  const base = Number(timeControl.split("+")[0]);
  return Number.isFinite(base) && base > 0 ? base : null;
}

export function openingNameFromEcoUrl(ecoUrl?: string | null): string | null {
  if (!ecoUrl) return null;
  const last = ecoUrl.split("/").pop() ?? "";
  return last.replace(/-/g, " ").replace(/\.\.\..*$/, "").trim() || null;
}
