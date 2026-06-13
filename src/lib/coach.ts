import type { CoachingDossier } from "./dossier";
import type { LessonContent, LessonSection } from "./types";

/**
 * Shared AI-coach logic: system prompt, model output types, validation.
 * Used by BOTH the server route (owner's env key) and the browser (user's
 * own key sent directly to api.anthropic.com — BYOK).
 *
 * Anti-hallucination contract: the model may only reference boards via
 * `positionId` from dossier.keyPositions; FENs, best moves and orientations
 * are re-attached from the dossier — never taken from the model. Square and
 * piece claims are restricted to the engine-verified `facts`.
 */

export const SYSTEM_PROMPT = `You are an elite chess coach who writes short, beautiful, personal lessons. You receive a factual "coaching dossier" about one player: their ratings, recurring mistake patterns (verified by Stockfish), time management, conversion of winning positions, and a list of key positions from their real games.

Write ONE lesson following these teaching principles:
- ONE tightly-scoped concept per lesson (working memory is small). Pick the angle with the highest rating impact given the dossier — and if the dossier reveals something more specific than generic categories (e.g. "blunders mostly in zeitnot", "wins evaporate after reaching +3", "collapses in one opening"), prefer that sharper angle.
- Ground everything in the player's MISSION: cite their actual numbers from the dossier (counts, percentages, clock times). Never invent numbers.
- Knowledge first (short), then skills via drills on their own positions, then a retrieval-practice quiz.
- Quiz answer choices must be roughly the same length — no formatting clues. 2-3 questions.
- End with one high-trust primary source (lichess.org/practice, lichess.org/training/<theme>, or a well-known free resource).
- Tone: warm, direct, second person ("tu" in French). No filler.

CHESS ACCURACY — ZERO TOLERANCE:
- Each key position carries a "facts" object verified by a chess engine: sideToMove, playedMove, bestMove (with exact from→to squares and captures), bestGivesCheck, hangingPieces.
- You may ONLY name squares, piece locations, captures, checks, or claim a piece is "hanging"/"attacked"/"en prise" if that exact fact appears in that position's facts. NOTHING else about the board may be asserted.
- If a detail you want is not in facts, describe the IDEA without naming squares ("a piece was left undefended", "the winning capture").
- Never compute chess yourself. Never guess coordinates. A single wrong square destroys the lesson's credibility.

Hard rules:
- Respond with ONLY a JSON object, no markdown fences, matching:
{"title": string, "concept": string, "mission": string, "sections": [{"type":"text","heading":string,"body":string} | {"type":"board","heading":string,"positionId":string,"theory":string,"task":string,"explain":string,"overlays":{"whiteAttacks"?:bool,"blackAttacks"?:bool,"hanging"?:bool}} | {"type":"quiz","questions":[{"q":string,"choices":[string,string,string],"answerIdx":number,"explain":string}]}], "primarySource":{"label":string,"url":string}}
- Boards: reference positions ONLY by their "id" from keyPositions ("p1", "p2"...). Use 2 to 4 boards, chosen to illustrate the single concept. In "theory" (1-2 sentences, shown BEFORE solving), give the strategic philosophy behind this step — the deeper principle at play — WITHOUT hinting at the move. In "task", describe what to look for WITHOUT revealing the move. In "explain" (1-3 sentences, shown only AFTER the player finds the move), teach WHY the move works — the facts rule applies to theory and explain too.
- 1-2 text sections max, each under 120 words. Mission under 80 words.
- Write every string in the language requested by the user message.`;

export interface ModelSection {
  type: "text" | "board" | "quiz";
  heading?: string;
  body?: string;
  positionId?: string;
  theory?: string;
  task?: string;
  explain?: string;
  overlays?: { whiteAttacks?: boolean; blackAttacks?: boolean; hanging?: boolean };
  questions?: { q: string; choices: string[]; answerIdx: number; explain: string }[];
}

export interface ModelLesson {
  title: string;
  concept: string;
  mission: string;
  sections: ModelSection[];
  primarySource: { label: string; url: string };
}

export function buildUserContent(args: {
  dossier: CoachingDossier;
  locale: "en" | "fr";
  pastLessonTitles?: string[];
  focus?: string;
}): string {
  const language = args.locale === "fr" ? "French" : "English";
  const past = args.pastLessonTitles?.length
    ? `\nAlready covered (write something DIFFERENT): ${args.pastLessonTitles.slice(-8).join(" | ")}`
    : "";
  const focus = args.focus ? `\nFocus: ${String(args.focus).slice(0, 200)}` : "";
  return `Language: write everything in ${language}.${past}${focus}\n\nCoaching dossier:\n${JSON.stringify(args.dossier)}`;
}

export function parseModelText(text: string): ModelLesson | null {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd <= jsonStart) return null;
  try {
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as ModelLesson;
  } catch {
    return null;
  }
}

export function sanitize(
  model: ModelLesson,
  dossier: CoachingDossier
): (LessonContent & { title: string }) | null {
  if (!model?.title || !model.concept || !model.mission || !Array.isArray(model.sections)) return null;
  const positions = new Map(dossier.keyPositions.map((p) => [p.id, p]));
  const sections: LessonSection[] = [];
  let boards = 0;

  for (const s of model.sections.slice(0, 8)) {
    if (s.type === "text" && s.body) {
      sections.push({ type: "text", heading: s.heading, body: String(s.body) });
    } else if (s.type === "board" && s.positionId) {
      const pos = positions.get(s.positionId);
      if (!pos || boards >= 4) continue;
      boards++;
      sections.push({
        type: "board",
        heading: s.heading,
        fen: pos.fen, // dossier truth, never the model's
        orientation: pos.userSide,
        task: String(s.task ?? ""),
        theory: typeof s.theory === "string" ? s.theory.slice(0, 400) : undefined,
        explain: typeof s.explain === "string" ? s.explain.slice(0, 600) : undefined,
        answerSan: pos.best ? [pos.best] : undefined,
        answerLine: pos.best ? [pos.best] : undefined,
        overlays: {
          whiteAttacks: Boolean(s.overlays?.whiteAttacks),
          blackAttacks: Boolean(s.overlays?.blackAttacks),
          hanging: s.overlays?.hanging !== false,
        },
        sourceUrl: pos.sourceUrl,
      });
    } else if (s.type === "quiz" && Array.isArray(s.questions) && s.questions.length) {
      const questions = s.questions
        .slice(0, 3)
        .filter((q) => q?.q && Array.isArray(q.choices) && q.choices.length >= 2)
        .map((q) => ({
          q: String(q.q),
          choices: q.choices.slice(0, 4).map(String),
          answerIdx: Math.min(Math.max(0, Number(q.answerIdx) || 0), q.choices.length - 1),
          explain: String(q.explain ?? ""),
        }));
      if (questions.length) sections.push({ type: "quiz", questions });
    }
  }

  if (boards === 0) return null;
  let url = "https://lichess.org/practice";
  try {
    const parsed = new URL(String(model.primarySource?.url));
    if (parsed.protocol === "https:") url = parsed.toString();
  } catch {
    /* keep default */
  }

  return {
    title: String(model.title),
    concept: String(model.concept),
    mission: String(model.mission),
    sections,
    primarySource: { label: String(model.primarySource?.label ?? "Lichess Practice"), url },
  };
}

export const DEFAULT_MODEL = "claude-sonnet-4-6";
