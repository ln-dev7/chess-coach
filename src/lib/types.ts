export type Platform = "chesscom" | "lichess";
export type TimeClass = "bullet" | "blitz" | "rapid" | "daily" | "classical" | "correspondence";
export type GameResult = "win" | "loss" | "draw";
export type Phase = "opening" | "middlegame" | "endgame";

export type Motif =
  | "hanging_piece"
  | "missed_tactic"
  | "allowed_fork"
  | "allowed_mate"
  | "missed_mate"
  | "bad_trade"
  | "other";

export interface GameRow {
  id: string;
  platform: Platform;
  external_id: string;
  url: string | null;
  pgn: string;
  time_class: TimeClass;
  time_control: string | null;
  rated: boolean;
  played_at: string;
  user_color: "w" | "b";
  user_rating: number | null;
  opponent_rating: number | null;
  opponent_name: string | null;
  result: GameResult;
  eco: string | null;
  opening_name: string | null;
  accuracy_user: number | null;
  analysis_status: "pending" | "analyzing" | "done" | "failed" | "skipped";
}

export interface MoveIssue {
  ply: number; // 1-based ply of the move played by the user
  san: string;
  uci: string;
  fenBefore: string;
  severity: "blunder" | "mistake" | "inaccuracy";
  motif: Motif;
  phase: Phase;
  cpBefore: number; // from user's POV, centipawns (mate mapped to ±10000)
  cpAfter: number;
  winDrop: number; // 0..1 win probability drop
  bestUci: string | null;
  bestSan: string | null;
}

export interface AnalysisSummary {
  acpl: number;
  accuracy: number; // 0..100
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  issues: MoveIssue[];
  byPhase: Record<Phase, { blunders: number; mistakes: number; moves: number }>;
  engineDepthOrTime: string;
}

export interface PuzzleRow {
  id: string; // `${game_id}#${ply-or-fen-hash}`
  game_id: string;
  fen: string;
  solution_san: string[]; // moves the user must find (user side first)
  reply_san: string[]; // opponent replies interleaved (solution[0], reply[0], solution[1]...)
  theme: Motif;
  severity: "blunder" | "mistake" | "inaccuracy";
  user_side: "w" | "b";
  source_url: string | null;
  attempts: number;
  solved: boolean;
  created_at: string;
  /** "tactic" = find the winning shot; "save" = find the only holding move. */
  kind?: "tactic" | "save";
  difficulty?: "easy" | "medium" | "hard";
  /** The move actually played in the source game. */
  played_san?: string;
}

export interface LessonSectionText {
  type: "text";
  heading?: string;
  body: string;
}

export interface BoardOverlaySpec {
  whiteAttacks?: boolean;
  blackAttacks?: boolean;
  hanging?: boolean;
}

export interface LessonSectionBoard {
  type: "board";
  heading?: string;
  exampleIndex?: number;
  fen: string;
  orientation: "w" | "b";
  task: string;
  answerSan?: string[]; // if present, board is in "find the move" mode
  /** The move actually played in the user's game (shown after solving). */
  playedSan?: string;
  /** Short theory note shown BEFORE solving: the philosophy behind the choice (no spoilers). */
  theory?: string;
  /** Full continuation (user + opponent moves interleaved) playable after success. */
  answerLine?: string[];
  /** Short theory note shown once the right move is found. */
  explain?: string;
  overlays?: BoardOverlaySpec;
  sourceUrl?: string | null;
}

export interface LessonQuizQuestion {
  q: string;
  choices: string[]; // keep choices roughly the same length (teach-skill rule)
  answerIdx: number;
  explain: string;
}

export interface LessonSectionQuiz {
  type: "quiz";
  heading?: string;
  questions: LessonQuizQuestion[];
}

export type LessonSection = LessonSectionText | LessonSectionBoard | LessonSectionQuiz;

export interface LessonContent {
  concept: string; // the single mental model taught
  mission: string; // why this matters for THIS player (grounded in their data)
  sections: LessonSection[];
  primarySource: { label: string; url: string };
}

/** A generated lesson: stores only data; text is localized at render time. */
export interface GeneratedLesson {
  slug: string;
  theme: Motif | "lines_of_force";
  created_at: string;
  completed: boolean;
  examples: LessonExample[];
  stats: { totalAnalyzed: number; motifCount: number; blundersPerGame: number };
}

export interface LessonExample {
  fen: string;
  user_side: "w" | "b";
  solution_san: string[];
  reply_san?: string[];
  /** The move actually played in the user's game. */
  played?: string;
  source_url: string | null;
}

export interface Settings {
  chesscomUsername: string;
  lichessUsername: string;
  analyzeLastN: number;
  engineMovetimeMs: number;
  boardTheme: string;
  /** Lesson feedback sounds (correct / wrong / complete). Defaults to on. */
  soundEnabled?: boolean;
  /** Read-aloud (text-to-speech) buttons in lessons & masters. Defaults to on. */
  voiceEnabled?: boolean;
  /** Preferred speech-synthesis voice (voiceURI). Empty = auto-pick the best. */
  voiceURI?: string;
}

/** A lesson written by the AI coach. Text is in `locale` (generated in the site language). */
export interface AiLessonRow {
  id: string; // "ai-<timestamp>"
  locale: "en" | "fr";
  created_at: string;
  completed: boolean;
  title: string;
  content: LessonContent;
}

export interface WeaknessProfile {
  totalAnalyzed: number;
  avgAccuracy: number | null;
  blundersPerGame: number;
  topMotifs: { motif: Motif; count: number }[];
  weakestPhase: { phase: Phase; blunderRate: number } | null;
  worstOpenings: { eco: string; name: string | null; games: number; score: number }[];
}

// ---------- Masters: learn from iconic grandmaster games ----------

/** A curated, build-time-validated iconic game (see src/lib/masters/catalog.json). */
export interface MasterGame {
  id: string; // stable slug, e.g. "byrne-fischer-1956"
  pgn: string; // validated by parsePgn at build time
  title: string;
  white: string;
  black: string;
  event: string | null;
  year: number;
  result: string; // "1-0" | "0-1" | "1/2-1/2" | "*"
  studySide: "w" | "b"; // whose plan we narrate
  tags: string[];
  sourceUrl: string | null;
  teaser: { en: string; fr: string };
}

/** One ply's generated reasoning. */
export interface MasterMoveNote {
  ply: number; // 1-based, matches parsePgn move index
  reasoning: string; // the plan/logic — full, may be long
  motif?: Motif; // optional tactical/strategic tag
}

/** Cached AI generation for ONE game in ONE locale. */
export interface MasterAnnotation {
  gameId: string;
  locale: "en" | "fr";
  created_at: string;
  intro: string; // game-level framing
  notes: MasterMoveNote[];
}
