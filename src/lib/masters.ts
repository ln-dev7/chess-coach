import { buildFacts, type PositionFacts } from "./dossier";
import { parsePgn } from "./pgn";
import type { MasterAnnotation, MasterGame, MasterMoveNote, Motif } from "./types";

/**
 * Shared logic for the masters feature: the system prompt, the per-move fact
 * extraction, and response parsing/validation. Used by BOTH the browser (BYOK,
 * key sent straight to the provider) and the server route (owner's env key) —
 * exactly like coach.ts.
 *
 * Anti-hallucination contract: the model may only name squares/pieces/captures/
 * checks that appear in the per-ply `facts` (built by chess.js). It must NOT
 * invent numeric engine evaluations — engine analysis is offered separately,
 * on demand, in the UI. The reasoning is framed as expert interpretation of a
 * strong player's plan, never a claim to know their actual thoughts.
 */

const VALID_MOTIFS: ReadonlySet<string> = new Set<Motif>([
  "hanging_piece",
  "missed_tactic",
  "allowed_fork",
  "allowed_mate",
  "missed_mate",
  "bad_trade",
  "other",
]);

export const MASTERS_SYSTEM_PROMPT = `You are a warm, precise chess teacher narrating a famous game so an improving player understands WHY each move was played — the plan, the idea, the logic, the threats created and parried. Be complete and concrete; long is fine when the position is rich.

You receive: the game's players/event/year, which side we are STUDYING (whose plan to narrate in depth), and the full move list. Each move carries an engine-free "facts" object verified by a chess board: sideToMove, playedMove (e.g. "knight g1→f3"), and hangingPieces.

Write reasoning for EVERY move of the studied side, and for the opponent's important replies (captures, checks, threats, defenses, turning points). Quiet developing moves can be one sentence; critical moments deserve several.

HOW TO NARRATE:
- Explain the PLAN and the IDEA: what the move prepares, attacks, defends, or provokes; how it fits the whole game's story; the principle behind it (development, king safety, the initiative, weak squares, open files, piece activity, pawn structure).
- Frame as expert interpretation: "the idea is…", "White aims to…", "this prepares…". NEVER claim to know the player's literal thoughts.
- When a move is a sacrifice or a combination, explain what is given and what is gained.

ZERO-TOLERANCE ACCURACY:
- You may ONLY name a square, piece, capture or check if it appears in that move's "facts" (playedMove / hangingPieces) — for that ply or an adjacent one you are explicitly describing. If a detail is not in the facts, describe the idea WITHOUT naming squares.
- NEVER state a numeric engine evaluation (no "+2.5", "winning by a rook"). Talk in ideas and threats, not engine numbers.
- Never invent moves that were not played.

Respond with ONLY a JSON object, no markdown fences, matching:
{"intro": string, "notes": [{"ply": number, "reasoning": string, "motif"?: "hanging_piece"|"missed_tactic"|"allowed_fork"|"allowed_mate"|"missed_mate"|"bad_trade"|"other"}]}
- "intro": 2-4 sentences setting up the game — the players, the era/opening, and what makes it instructive.
- "ply" is the 1-based move index from the supplied move list. One note per narrated ply.
- Write every string in the language requested by the user message.`;

/** A move with its chess.js-verified facts, fed to the model. */
export interface MasterPly {
  ply: number; // 1-based
  san: string;
  color: "w" | "b";
  facts: PositionFacts;
}

/** Build the per-ply facts for a game from its (build-time validated) PGN. */
export function buildMasterPlies(game: MasterGame): MasterPly[] {
  const parsed = parsePgn(game.pgn);
  if (!parsed) return [];
  return parsed.moves.map((m, i) => ({
    ply: i + 1,
    san: m.san,
    color: m.color,
    facts: buildFacts(parsed.fens[i], m.san, null),
  }));
}

export function buildMastersUserContent(args: {
  game: MasterGame;
  plies: MasterPly[];
  locale: "en" | "fr";
}): string {
  const language = args.locale === "fr" ? "French" : "English";
  const { game } = args;
  const studied = game.studySide === "w" ? `White (${game.white})` : `Black (${game.black})`;
  const header = {
    white: game.white,
    black: game.black,
    event: game.event,
    year: game.year,
    result: game.result,
    studying: studied,
    title: game.title,
  };
  const moves = args.plies.map((p) => ({
    ply: p.ply,
    side: p.color === "w" ? "white" : "black",
    san: p.san,
    facts: { played: p.facts.playedMove, hanging: p.facts.hangingPieces },
  }));
  return `Language: write everything in ${language}.\nStudy the plan of: ${studied}.\n\nGame:\n${JSON.stringify(
    header
  )}\n\nMoves (with board-verified facts):\n${JSON.stringify(moves)}`;
}

interface ModelMasterNote {
  ply?: unknown;
  reasoning?: unknown;
  motif?: unknown;
}
interface ModelMasterAnnotation {
  intro?: unknown;
  notes?: unknown;
}

export function parseMastersText(text: string): ModelMasterAnnotation | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as ModelMasterAnnotation;
  } catch {
    return null;
  }
}

/**
 * Validate the model output into a MasterAnnotation. FEN/moves never come from
 * the model — only ply indices into our own move list. Out-of-range plies and
 * unknown motifs are dropped; an empty result is rejected.
 */
export function sanitizeMasterAnnotation(
  model: ModelMasterAnnotation,
  ctx: { gameId: string; locale: "en" | "fr"; plyCount: number; createdAt: string }
): MasterAnnotation | null {
  if (!model || !Array.isArray(model.notes)) return null;
  const seen = new Set<number>();
  const notes: MasterMoveNote[] = [];
  for (const raw of model.notes as ModelMasterNote[]) {
    const ply = Number(raw?.ply);
    if (!Number.isInteger(ply) || ply < 1 || ply > ctx.plyCount || seen.has(ply)) continue;
    const reasoning = typeof raw?.reasoning === "string" ? raw.reasoning.trim() : "";
    if (!reasoning) continue;
    seen.add(ply);
    const note: MasterMoveNote = { ply, reasoning: reasoning.slice(0, 1200) };
    if (typeof raw?.motif === "string" && VALID_MOTIFS.has(raw.motif)) note.motif = raw.motif as Motif;
    notes.push(note);
  }
  if (!notes.length) return null;
  notes.sort((a, b) => a.ply - b.ply);
  const intro = typeof model.intro === "string" ? model.intro.trim().slice(0, 1200) : "";
  return { gameId: ctx.gameId, locale: ctx.locale, created_at: ctx.createdAt, intro, notes };
}

/** Long games need more output tokens so the per-move narration isn't truncated. */
export const MASTERS_MAX_TOKENS = 8192;
