import { Chess, type Square } from "chess.js";
import { extractClocks, parseBaseTime } from "./pgn";
import { buildWeaknessProfile } from "./stats";
import type { AnalysisSummary, GameRow, Motif, MoveIssue, Phase } from "./types";

/**
 * The coaching dossier: a compact, factual JSON snapshot of how this player
 * actually plays. It is the ONLY chess-truth source the AI coach is allowed
 * to use — every board it shows must come from `keyPositions` (referenced by
 * id), so the model can never hallucinate a position.
 */

export interface DossierPosition {
  id: string;
  fen: string;
  userSide: "w" | "b";
  played: string; // SAN the player actually played
  best: string | null; // engine best (SAN)
  cpBefore: number; // eval before the move, player's POV (centipawns)
  winDrop: number; // 0..1
  motif: Motif;
  phase: Phase;
  clockSec: number | null; // time left when the move was played
  opening: string | null;
  result: "win" | "loss" | "draw";
  sourceUrl: string | null;
  /** Board-verified facts (chess.js). The ONLY square/piece claims the coach may make. */
  facts: PositionFacts;
}

export interface PositionFacts {
  sideToMove: "white" | "black";
  /** e.g. "queen d1→h5 capturing the knight on h5" */
  playedMove: string | null;
  bestMove: string | null;
  bestGivesCheck: boolean;
  /** Pieces with more attackers than defenders, e.g. "white queen on h5". */
  hangingPieces: string[];
}

const PIECE_NAMES: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

function moveFact(fen: string, san: string | null): { text: string; check: boolean } | null {
  if (!san) return null;
  try {
    const c = new Chess(fen);
    const m = c.move(san);
    if (!m) return null;
    const cap = m.captured ? ` capturing the ${PIECE_NAMES[m.captured]} on ${m.to}` : "";
    return {
      text: `${PIECE_NAMES[m.piece]} ${m.from}→${m.to}${cap}`,
      check: m.san.includes("+") || m.san.includes("#"),
    };
  } catch {
    return null;
  }
}

function hangingFacts(fen: string): string[] {
  try {
    const c = new Chess(fen);
    const out: string[] = [];
    for (const row of c.board()) {
      for (const sq of row) {
        if (!sq || sq.type === "k") continue;
        const enemy = sq.color === "w" ? "b" : "w";
        if (c.attackers(sq.square as Square, enemy).length > c.attackers(sq.square as Square, sq.color).length) {
          out.push(`${sq.color === "w" ? "white" : "black"} ${PIECE_NAMES[sq.type]} on ${sq.square}`);
        }
      }
    }
    return out.slice(0, 5);
  } catch {
    return [];
  }
}

function buildFacts(fen: string, playedSan: string, bestSan: string | null): PositionFacts {
  const played = moveFact(fen, playedSan);
  const best = moveFact(fen, bestSan);
  return {
    sideToMove: fen.split(" ")[1] === "w" ? "white" : "black",
    playedMove: played?.text ?? null,
    bestMove: best?.text ?? null,
    bestGivesCheck: best?.check ?? false,
    hangingPieces: hangingFacts(fen),
  };
}

export interface CoachingDossier {
  player: {
    timeClasses: { timeClass: string; games: number; latestRating: number | null }[];
    ratingTrend: { timeClass: string; deltaLast30: number } | null;
    totalGames: number;
    analyzedGames: number;
    winRate: number | null;
    avgAccuracy: number | null;
    blundersPerGame: number;
  };
  weaknesses: {
    topMotifs: { motif: Motif; count: number }[];
    weakestPhase: { phase: Phase; blunderRate: number } | null;
    worstOpenings: { eco: string; name: string | null; games: number; scorePct: number }[];
  };
  timeManagement: {
    hasClockData: boolean;
    blundersInZeitnotPct: number | null; // % of blunders played with <60s or <10% of base time
    avgClockAtBlunderSec: number | null;
  };
  conversion: {
    gamesWithWinningPosition: number; // analyzed games where eval reached >= +3 for the player
    blownWins: number; // ...that ended in loss or draw
    conversionPct: number | null;
  };
  keyPositions: DossierPosition[];
}

const ZEITNOT_FLOOR_SEC = 60;

export interface DossierOptions {
  /** Keep only matching issues (e.g. endgame-only, tactics-only) for a focused lesson. */
  issueFilter?: (issue: MoveIssue) => boolean;
}

export function buildDossier(
  games: GameRow[],
  analyses: Record<string, AnalysisSummary>,
  opts: DossierOptions = {}
): CoachingDossier {
  const analyzedGames = games.filter((g) => analyses[g.id]);
  const summaries = analyzedGames.map((g) => analyses[g.id]);
  const profile = buildWeaknessProfile(games, summaries);

  // --- player overview ---
  const byClass = new Map<string, { games: number; latestRating: number | null; latestDate: string }>();
  for (const g of games) {
    const cur = byClass.get(g.time_class) ?? { games: 0, latestRating: null, latestDate: "" };
    cur.games++;
    if (g.rated && g.user_rating && g.played_at > cur.latestDate) {
      cur.latestRating = g.user_rating;
      cur.latestDate = g.played_at;
    }
    byClass.set(g.time_class, cur);
  }
  const timeClasses = [...byClass.entries()]
    .map(([timeClass, v]) => ({ timeClass, games: v.games, latestRating: v.latestRating }))
    .sort((a, b) => b.games - a.games);

  // Rating trend on the main time class over the last 30 rated games.
  let ratingTrend: CoachingDossier["player"]["ratingTrend"] = null;
  const main = timeClasses[0];
  if (main) {
    const rated = games
      .filter((g) => g.time_class === main.timeClass && g.rated && g.user_rating)
      .sort((a, b) => a.played_at.localeCompare(b.played_at))
      .slice(-30);
    if (rated.length >= 5) {
      ratingTrend = {
        timeClass: main.timeClass,
        deltaLast30: (rated[rated.length - 1].user_rating ?? 0) - (rated[0].user_rating ?? 0),
      };
    }
  }

  const wins = games.filter((g) => g.result === "win").length;
  const draws = games.filter((g) => g.result === "draw").length;

  // --- collect issues with clock + game context ---
  interface IssueCtx {
    issue: MoveIssue;
    game: GameRow;
    clockSec: number | null;
  }
  const issueCtxs: IssueCtx[] = [];
  const clockCache = new Map<string, { clocks: number[] | null; base: number | null }>();

  for (const g of analyzedGames) {
    const summary = analyses[g.id];
    if (!summary?.issues?.length) continue;
    if (!clockCache.has(g.id)) {
      clockCache.set(g.id, { clocks: extractClocks(g.pgn), base: parseBaseTime(g.time_control) });
    }
    const { clocks } = clockCache.get(g.id)!;
    for (const issue of summary.issues) {
      if (opts.issueFilter && !opts.issueFilter(issue)) continue;
      issueCtxs.push({ issue, game: g, clockSec: clocks?.[issue.ply - 1] ?? null });
    }
  }

  // --- time management ---
  const blunderCtxs = issueCtxs.filter((c) => c.issue.severity === "blunder");
  const blundersWithClock = blunderCtxs.filter((c) => c.clockSec != null);
  let blundersInZeitnotPct: number | null = null;
  let avgClockAtBlunderSec: number | null = null;
  if (blundersWithClock.length >= 5) {
    const zeitnot = blundersWithClock.filter((c) => {
      const base = clockCache.get(c.game.id)?.base;
      const threshold = base ? Math.max(ZEITNOT_FLOOR_SEC, base * 0.1) : ZEITNOT_FLOOR_SEC;
      return (c.clockSec as number) <= threshold;
    });
    blundersInZeitnotPct = Math.round((zeitnot.length / blundersWithClock.length) * 100);
    avgClockAtBlunderSec = Math.round(
      blundersWithClock.reduce((s, c) => s + (c.clockSec as number), 0) / blundersWithClock.length
    );
  }

  // --- conversion of winning positions ---
  const winningGames = new Set<string>();
  const blownGames = new Set<string>();
  for (const c of issueCtxs) {
    if (c.issue.cpBefore >= 300) {
      winningGames.add(c.game.id);
      if (c.game.result !== "win") blownGames.add(c.game.id);
    }
  }
  const conversionPct = winningGames.size
    ? Math.round(((winningGames.size - blownGames.size) / winningGames.size) * 100)
    : null;

  // --- key positions: worst drops first, diversified by motif ---
  const sorted = [...issueCtxs]
    .filter((c) => c.issue.severity !== "inaccuracy" && c.issue.bestSan)
    .sort((a, b) => b.issue.winDrop - a.issue.winDrop);
  const picked: IssueCtx[] = [];
  const perMotif = new Map<string, number>();
  for (const c of sorted) {
    if (picked.length >= 14) break;
    const count = perMotif.get(c.issue.motif) ?? 0;
    if (count >= 4) continue; // keep variety
    perMotif.set(c.issue.motif, count + 1);
    picked.push(c);
  }

  const keyPositions: DossierPosition[] = picked.map((c, i) => ({
    id: `p${i + 1}`,
    fen: c.issue.fenBefore,
    userSide: c.game.user_color,
    played: c.issue.san,
    best: c.issue.bestSan,
    cpBefore: c.issue.cpBefore,
    winDrop: c.issue.winDrop,
    motif: c.issue.motif,
    phase: c.issue.phase,
    clockSec: c.clockSec,
    opening: c.game.opening_name ?? c.game.eco,
    result: c.game.result,
    sourceUrl: c.game.url,
    facts: buildFacts(c.issue.fenBefore, c.issue.san, c.issue.bestSan),
  }));

  return {
    player: {
      timeClasses,
      ratingTrend,
      totalGames: games.length,
      analyzedGames: analyzedGames.length,
      winRate: games.length ? Math.round(((wins + draws * 0.5) / games.length) * 1000) / 10 : null,
      avgAccuracy: profile.avgAccuracy,
      blundersPerGame: profile.blundersPerGame,
    },
    weaknesses: {
      topMotifs: profile.topMotifs,
      weakestPhase: profile.weakestPhase,
      worstOpenings: profile.worstOpenings.map((o) => ({ ...o, scorePct: o.score })),
    },
    timeManagement: {
      hasClockData: blundersWithClock.length > 0,
      blundersInZeitnotPct,
      avgClockAtBlunderSec,
    },
    conversion: {
      gamesWithWinningPosition: winningGames.size,
      blownWins: blownGames.size,
      conversionPct,
    },
    keyPositions,
  };
}
