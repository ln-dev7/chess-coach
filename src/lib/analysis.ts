import { Chess, type Square } from "chess.js";
import type { AnalysisSummary, Motif, MoveIssue, Phase } from "./types";

export interface PositionEval {
  cpWhite: number; // centipawns from White's POV; mate mapped to ±10000 - plies
  bestUci: string | null;
  pvUci: string[]; // principal variation (uci), from this position
}

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Lichess-style win probability from centipawns (side = White). 0..1 */
export function winProb(cpWhite: number): number {
  return 1 / (1 + Math.exp(-0.00368208 * Math.max(-1500, Math.min(1500, cpWhite))));
}

/** Lichess accuracy formula from win% loss (0..100 per move). */
function moveAccuracy(winLossPct: number): number {
  const a = 103.1668 * Math.exp(-0.04354 * winLossPct) - 3.1669;
  return Math.max(0, Math.min(100, a));
}

export function phaseOf(fen: string, plyIndex: number): Phase {
  if (plyIndex < 20) return "opening";
  const board = fen.split(" ")[0];
  let nonPawnNonKing = 0;
  for (const ch of board) {
    if (/[nbrqNBRQ]/.test(ch)) nonPawnNonKing++;
  }
  return nonPawnNonKing <= 6 ? "endgame" : "middlegame";
}

function uciToSan(fen: string, uci: string): string | null {
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return m?.san ?? null;
  } catch {
    return null;
  }
}

/** Count attackers minus defenders on a square (positive = under-defended target). */
function isUnderdefended(chess: Chess, square: Square, ownerColor: "w" | "b"): boolean {
  const enemy = ownerColor === "w" ? "b" : "w";
  const attackers = chess.attackers(square, enemy).length;
  const defenders = chess.attackers(square, ownerColor).length;
  return attackers > defenders;
}

/** Does `uci` (a move for side to move in fen) attack 2+ pieces worth >= 3? (fork heuristic) */
function createsForkLike(fen: string, uci: string): boolean {
  try {
    const c = new Chess(fen);
    const mover = c.turn();
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (!m) return false;
    // After the move it's the opponent's turn; check what the moved piece attacks.
    const to = m.to as Square;
    let valuableTargets = 0;
    for (const row of c.board()) {
      for (const sq of row) {
        if (!sq || sq.color === mover) continue;
        if (PIECE_VALUE[sq.type] < 3 && sq.type !== "k") continue;
        const attackers = c.attackers(sq.square as Square, mover);
        if (attackers.includes(to)) valuableTargets++;
      }
    }
    return valuableTargets >= 2;
  } catch {
    return false;
  }
}

function classifyMotif(args: {
  fenBefore: string; // position before the user's move
  fenAfter: string; // position after the user's move (opponent to move)
  userColor: "w" | "b";
  cpBeforeUser: number;
  cpAfterUser: number;
  bestReplyUci: string | null; // engine best for opponent after user's move
  bestMoveUci: string | null; // engine best for user instead of played move
}): Motif {
  const { fenAfter, userColor, cpBeforeUser, cpAfterUser, bestReplyUci, bestMoveUci, fenBefore } = args;

  if (cpAfterUser <= -9000) return "allowed_mate";
  if (cpBeforeUser >= 9000 && cpAfterUser < 9000) return "missed_mate";

  // Hanging piece: opponent's best reply captures an under-defended piece of ours.
  if (bestReplyUci) {
    try {
      const c = new Chess(fenAfter);
      const target = c.get(bestReplyUci.slice(2, 4) as Square);
      if (target && target.color === userColor) {
        if (isUnderdefended(c, bestReplyUci.slice(2, 4) as Square, userColor)) return "hanging_piece";
        // even-defended but bigger value lost = bad trade pattern
        const attacker = c.get(bestReplyUci.slice(0, 2) as Square);
        if (attacker && PIECE_VALUE[target.type] > PIECE_VALUE[attacker.type]) return "bad_trade";
      }
      // Fork allowed
      if (createsForkLike(fenAfter, bestReplyUci)) return "allowed_fork";
    } catch {
      /* fall through */
    }
  }

  // Missed tactic: we had a clearly winning continuation and played something else.
  if (cpBeforeUser >= 200 && cpAfterUser < 100 && bestMoveUci) {
    try {
      const c = new Chess(fenBefore);
      const m = c.move({ from: bestMoveUci.slice(0, 2), to: bestMoveUci.slice(2, 4), promotion: bestMoveUci[4] });
      if (m && (m.captured || m.san.includes("+") || createsForkLike(fenBefore, bestMoveUci))) {
        return "missed_tactic";
      }
    } catch {
      /* ignore */
    }
    return "missed_tactic";
  }

  return "other";
}

export interface GameForAnalysis {
  fens: string[]; // fens[i] = before ply i; length = moves+1
  moves: { san: string; uci: string; color: "w" | "b" }[];
  userColor: "w" | "b";
  evals: PositionEval[]; // one per fen
  engineLabel: string;
}

export interface PuzzleCandidate {
  fen: string;
  solution_san: string[];
  reply_san: string[];
  theme: Motif;
  severity: "blunder" | "mistake" | "inaccuracy";
  user_side: "w" | "b";
  kind: "tactic" | "save";
  difficulty: "easy" | "medium" | "hard";
}

export function summarizeGame(g: GameForAnalysis): { summary: AnalysisSummary; puzzles: PuzzleCandidate[] } {
  const issues: MoveIssue[] = [];
  const puzzles: PuzzleCandidate[] = [];
  const byPhase: AnalysisSummary["byPhase"] = {
    opening: { blunders: 0, mistakes: 0, moves: 0 },
    middlegame: { blunders: 0, mistakes: 0, moves: 0 },
    endgame: { blunders: 0, mistakes: 0, moves: 0 },
  };
  let cpLossSum = 0;
  let accSum = 0;
  let userMoves = 0;

  const sign = g.userColor === "w" ? 1 : -1;

  for (let i = 0; i < g.moves.length; i++) {
    const move = g.moves[i];
    if (move.color !== g.userColor) continue;
    const evBefore = g.evals[i];
    const evAfter = g.evals[i + 1];
    if (!evBefore || !evAfter) continue;

    userMoves++;
    const phase = phaseOf(g.fens[i], i);
    byPhase[phase].moves++;

    const cpBeforeUser = sign * evBefore.cpWhite;
    const cpAfterUser = sign * evAfter.cpWhite;
    const wpBefore = g.userColor === "w" ? winProb(evBefore.cpWhite) : 1 - winProb(evBefore.cpWhite);
    const wpAfter = g.userColor === "w" ? winProb(evAfter.cpWhite) : 1 - winProb(evAfter.cpWhite);
    const winDrop = Math.max(0, wpBefore - wpAfter);

    const cpLoss = Math.max(0, cpBeforeUser - cpAfterUser);
    cpLossSum += Math.min(cpLoss, 1000);
    accSum += moveAccuracy(winDrop * 100);

    let severity: MoveIssue["severity"] | null = null;
    if (winDrop >= 0.3) severity = "blunder";
    else if (winDrop >= 0.2) severity = "mistake";
    else if (winDrop >= 0.1) severity = "inaccuracy";
    if (!severity) continue;

    if (severity === "blunder") byPhase[phase].blunders++;
    if (severity === "mistake") byPhase[phase].mistakes++;

    const bestMoveUci = evBefore.bestUci;
    const bestReplyUci = evAfter.bestUci;
    const motif = classifyMotif({
      fenBefore: g.fens[i],
      fenAfter: g.fens[i + 1],
      userColor: g.userColor,
      cpBeforeUser,
      cpAfterUser,
      bestReplyUci,
      bestMoveUci,
    });

    issues.push({
      ply: i + 1,
      san: move.san,
      uci: move.uci,
      fenBefore: g.fens[i],
      severity,
      motif,
      phase,
      cpBefore: cpBeforeUser,
      cpAfter: cpAfterUser,
      winDrop: Math.round(winDrop * 1000) / 1000,
      bestUci: bestMoveUci,
      bestSan: bestMoveUci ? uciToSan(g.fens[i], bestMoveUci) : null,
    });

    // Puzzle: "what should you have played?" — user to move from fenBefore.
    //
    // QUALITY GATES — a position only becomes a puzzle when the best move is
    // genuinely worth finding (lichess-style), not just "engine's favorite
    // quiet move in an equal position":
    //   - "tactic": you had a clear edge (>= +1.5, incl. mate) that the best
    //     move proves — find the shot.
    //   - "save": the position was holdable (>= -0.8) and your move collapsed
    //     it (<= -2.5) — find the move that holds.
    if ((severity === "blunder" || severity === "mistake") && evBefore.pvUci.length > 0) {
      const isMateShot = cpBeforeUser >= 9000;
      const isTactic = cpBeforeUser >= 150;
      const isSave = cpBeforeUser >= -80 && cpAfterUser <= -250;

      if (isTactic || isSave) {
        const sol: string[] = [];
        const rep: string[] = [];
        const c = new Chess(g.fens[i]);
        for (let k = 0; k < Math.min(evBefore.pvUci.length, 5); k++) {
          const u = evBefore.pvUci[k];
          let san: string | null = null;
          try {
            const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
            san = m?.san ?? null;
          } catch {
            break;
          }
          if (!san) break;
          if (k % 2 === 0) sol.push(san);
          else rep.push(san);
          if (san.includes("#")) break; // stop the line at mate
        }

        if (sol.length > 0) {
          const solution = sol.slice(0, 3);
          const difficulty: PuzzleCandidate["difficulty"] =
            solution.length === 1 && (isMateShot || cpBeforeUser >= 300)
              ? "easy"
              : solution.length >= 3 || (!isMateShot && cpBeforeUser < 250)
              ? "hard"
              : "medium";

          puzzles.push({
            fen: g.fens[i],
            solution_san: solution,
            reply_san: rep.slice(0, 2),
            theme: motif,
            severity,
            user_side: g.userColor,
            kind: isTactic ? "tactic" : "save",
            difficulty,
          });
        }
      }
    }
  }

  const summary: AnalysisSummary = {
    acpl: userMoves ? Math.round(cpLossSum / userMoves) : 0,
    accuracy: userMoves ? Math.round((accSum / userMoves) * 10) / 10 : 0,
    blunders: issues.filter((x) => x.severity === "blunder").length,
    mistakes: issues.filter((x) => x.severity === "mistake").length,
    inaccuracies: issues.filter((x) => x.severity === "inaccuracy").length,
    issues,
    byPhase,
    engineDepthOrTime: g.engineLabel,
  };
  return { summary, puzzles };
}
