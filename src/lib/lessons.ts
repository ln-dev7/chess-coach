import type { Locale } from "./i18n";
import type {
  GeneratedLesson,
  LessonContent,
  LessonExample,
  Motif,
  PuzzleRow,
  WeaknessProfile,
} from "./types";

/**
 * Lesson generation, guided by the `teach` skill pedagogy
 * (docs/teaching-principles.md): one tightly-scoped concept per lesson,
 * grounded in the player's real weaknesses, knowledge → skills via tight
 * feedback loops, retrieval-practice quizzes, one high-trust primary source.
 *
 * Generated lessons store DATA only (positions + stats); all text lives in
 * localized templates below, so lessons follow the site language.
 */

interface LocalizedTemplate {
  title: string;
  concept: string;
  mission: (stats: GeneratedLesson["stats"]) => string;
  drill: string;
  /** Theory note shown after the player finds the right move. */
  answerExplain: string;
  quiz: { q: string; choices: string[]; answerIdx: number; explain: string }[];
  sourceLabel: string;
}

interface LessonTemplate {
  slug: string;
  theme: Motif | "lines_of_force";
  sourceUrl: string;
  overlays: { whiteAttacks?: boolean; blackAttacks?: boolean; hanging?: boolean };
  maxExamples: number;
  i18n: Record<Locale, LocalizedTemplate>;
}

const TEMPLATES: LessonTemplate[] = [
  {
    slug: "lines-of-force",
    theme: "lines_of_force",
    sourceUrl: "https://lichess.org/practice",
    overlays: { whiteAttacks: true, blackAttacks: true, hanging: true },
    maxExamples: 3,
    i18n: {
      en: {
        title: "See the Lines of Force",
        concept:
          "A board isn't 32 pieces — it's a web of beams of control. A bishop is a laser on its diagonals; a rook, a cross-beam down its file and rank. A square is safe or hanging depending on whose beams hit it, and how many.",
        mission: (s) =>
          `You blunder about ${s.blundersPerGame} times per game (last ${s.totalAnalyzed} analyzed). Most blunders are not calculation failures — they are vision failures: a beam you didn't see. This lesson trains your eye.`,
        drill:
          "Flip on the overlays and find the move you should have played. Watch which beams you missed in the real game.",
        answerExplain:
          "The right move works because of the beams: count attackers vs defenders on the target square and the geometry does the rest. In the real game, one of those beams went unseen.",
        quiz: [
          {
            q: "A knight on e5 is attacked twice and defended once. What is its status?",
            choices: ["It is effectively hanging", "It is adequately defended", "It depends on king safety"],
            answerIdx: 0,
            explain:
              "More attackers than defenders means the piece can be won by a capture sequence (2v1 on a knight usually loses it).",
          },
          {
            q: "What should a beam sweep check first, before every move you play?",
            choices: ["Squares hit by more enemy beams", "Squares near the enemy monarch", "Squares your pawns can occupy"],
            answerIdx: 0,
            explain: "Safety first: find your under-defended pieces before thinking about plans.",
          },
        ],
        sourceLabel: "Lichess Practice — vision drills",
      },
      fr: {
        title: "Voir les lignes de force",
        concept:
          "Un échiquier, ce n'est pas 32 pièces — c'est un réseau de rayons de contrôle. Un fou est un laser sur ses diagonales ; une tour, un faisceau sur sa colonne et sa rangée. Une case est sûre ou en prise selon les rayons qui la touchent, et leur nombre.",
        mission: (s) =>
          `Tu gaffes environ ${s.blundersPerGame} fois par partie (sur tes ${s.totalAnalyzed} dernières parties analysées). La plupart des gaffes ne sont pas des erreurs de calcul — ce sont des erreurs de vision : un rayon que tu n'as pas vu. Cette leçon entraîne ton œil.`,
        drill:
          "Active les calques et trouve le coup que tu aurais dû jouer. Regarde quels rayons tu as ratés dans la vraie partie.",
        answerExplain:
          "Le bon coup fonctionne grâce aux rayons : compte les attaquants et les défenseurs de la case visée, la géométrie fait le reste. Dans la vraie partie, un de ces rayons est passé inaperçu.",
        quiz: [
          {
            q: "Un cavalier en e5 est attaqué deux fois et défendu une fois. Quel est son statut ?",
            choices: ["Il est en prise, de fait", "Il est suffisamment défendu", "Ça dépend de la sécurité du roi"],
            answerIdx: 0,
            explain:
              "Plus d'attaquants que de défenseurs : la pièce peut être gagnée par une séquence de prises (2 contre 1 sur un cavalier, il tombe en général).",
          },
          {
            q: "Que doit vérifier en premier un balayage des rayons, avant chaque coup ?",
            choices: ["Les cases touchées par plus de rayons ennemis", "Les cases proches du roi adverse", "Les cases que tes pions peuvent occuper"],
            answerIdx: 0,
            explain: "La sécurité d'abord : repère tes pièces sous-défendues avant de penser aux plans.",
          },
        ],
        sourceLabel: "Lichess Practice — exercices de vision",
      },
    },
  },
  {
    slug: "hanging-piece-radar",
    theme: "hanging_piece",
    sourceUrl: "https://lichess.org/training/hangingPiece",
    overlays: { hanging: true },
    maxExamples: 4,
    i18n: {
      en: {
        title: "The Hanging Piece Radar",
        concept:
          "Every move, two questions: 'What did my opponent's last move stop defending?' and 'What does my planned move stop defending?' Undefended pieces are gravity — tactics fall toward them.",
        mission: (s) =>
          `This pattern cost you material ${s.motifCount} times in your last ${s.totalAnalyzed} analyzed games. Fixing it is the fastest rating gain available to you.`,
        drill: "Find the punishing capture or the saving move in these positions from your games.",
        answerExplain:
          "This move wins (or saves) material because the target piece had more attackers than defenders. Before every move, scan for pieces left without enough protection.",
        quiz: [
          {
            q: "Your opponent just moved a defender away. What do you check first?",
            choices: ["What that piece no longer protects", "Whether your king is now in check", "Which of your pawns can advance"],
            answerIdx: 0,
            explain: "Every move abandons something. Train the reflex: 'what did that move stop defending?'",
          },
        ],
        sourceLabel: "Lichess tactics — hanging piece theme",
      },
      fr: {
        title: "Le radar à pièces en prise",
        concept:
          "À chaque coup, deux questions : « Qu'est-ce que le dernier coup adverse a cessé de défendre ? » et « Qu'est-ce que mon coup prévu cesse de défendre ? » Les pièces sans défense sont des aimants — les tactiques convergent vers elles.",
        mission: (s) =>
          `Ce schéma t'a coûté du matériel ${s.motifCount} fois sur tes ${s.totalAnalyzed} dernières parties analysées. Le corriger est ton gain de classement le plus rapide.`,
        drill: "Trouve la prise punitive ou le coup sauveur dans ces positions tirées de tes parties.",
        answerExplain:
          "Ce coup gagne (ou sauve) du matériel parce que la pièce visée avait plus d'attaquants que de défenseurs. Avant chaque coup, balaie les pièces insuffisamment protégées.",
        quiz: [
          {
            q: "Ton adversaire vient d'éloigner un défenseur. Que vérifies-tu en premier ?",
            choices: ["Ce que cette pièce ne protège plus", "Si ton roi est maintenant en échec", "Lequel de tes pions peut avancer"],
            answerIdx: 0,
            explain: "Chaque coup abandonne quelque chose. Entraîne le réflexe : « qu'est-ce que ce coup a cessé de défendre ? »",
          },
        ],
        sourceLabel: "Tactiques Lichess — thème pièce en prise",
      },
    },
  },
  {
    slug: "winning-shots",
    theme: "missed_tactic",
    sourceUrl: "https://lichess.org/training/mix",
    overlays: { hanging: true },
    maxExamples: 4,
    i18n: {
      en: {
        title: "Pull the Trigger: Winning Shots You Missed",
        concept:
          "When you are better, there is often one forcing move that ends the discussion. Checks, captures, threats — in that order. If you don't scan forcing moves first, you play a 'safe' move and the win evaporates.",
        mission: (s) =>
          `You missed a winning shot ${s.motifCount} times in your last ${s.totalAnalyzed} analyzed games. Each one was a point left on the table.`,
        drill: "Each position below had a winning shot you didn't play. Checks, captures, threats — find it.",
        answerExplain:
          "The move is forcing: it limits the opponent's replies (check, capture or direct threat) so the advantage cannot slip away. Forcing moves first — always.",
        quiz: [
          {
            q: "What is the correct scan order when looking for tactics?",
            choices: ["Checks, captures, threats", "Threats, checks, captures", "Captures, threats, checks"],
            answerIdx: 0,
            explain: "Forcing moves first: checks limit replies the most, then captures, then threats.",
          },
        ],
        sourceLabel: "Lichess tactics — mixed forcing themes",
      },
      fr: {
        title: "Appuie sur la détente : les coups gagnants ratés",
        concept:
          "Quand tu es mieux, il existe souvent un coup forcé qui clôt le débat. Échecs, prises, menaces — dans cet ordre. Si tu ne balaies pas d'abord les coups forcés, tu joues un coup « sûr » et le gain s'évapore.",
        mission: (s) =>
          `Tu as raté un coup gagnant ${s.motifCount} fois sur tes ${s.totalAnalyzed} dernières parties analysées. Autant de points laissés sur la table.`,
        drill: "Chaque position ci-dessous contenait un coup gagnant que tu n'as pas joué. Échecs, prises, menaces — trouve-le.",
        answerExplain:
          "Le coup est forcé : il limite les réponses adverses (échec, prise ou menace directe), donc l'avantage ne peut plus s'échapper. Les coups forcés d'abord — toujours.",
        quiz: [
          {
            q: "Quel est le bon ordre de balayage pour chercher une tactique ?",
            choices: ["Échecs, prises, menaces", "Menaces, échecs, prises", "Prises, menaces, échecs"],
            answerIdx: 0,
            explain: "Les coups forcés d'abord : l'échec limite le plus les réponses, puis les prises, puis les menaces.",
          },
        ],
        sourceLabel: "Tactiques Lichess — thèmes forcés variés",
      },
    },
  },
  {
    slug: "fork-prophylaxis",
    theme: "allowed_fork",
    sourceUrl: "https://lichess.org/training/fork",
    overlays: { hanging: true },
    maxExamples: 4,
    i18n: {
      en: {
        title: "Fork-Proof Your Pieces",
        concept:
          "Forks need geometry: two loose targets on the same knight wheel or pawn diagonal. Deny the geometry — keep pieces defended and watch the soft squares around your king.",
        mission: (s) =>
          `You allowed a fork or double attack ${s.motifCount} times in your last ${s.totalAnalyzed} analyzed games.`,
        drill: "In these positions you allowed a fork. Find the move that denies the geometry instead.",
        answerExplain:
          "The right move breaks the fork geometry: it defends or relocates one of the two targets, so the double attack no longer wins anything.",
        quiz: [
          {
            q: "What do all forks need to exist?",
            choices: ["Two loose targets on one geometry", "A queen active near the center", "An open file for the rooks"],
            answerIdx: 0,
            explain: "No loose pieces, no fork. Keep your pieces defended and the geometry never appears.",
          },
        ],
        sourceLabel: "Lichess tactics — knight fork theme",
      },
      fr: {
        title: "Blinde tes pièces contre les fourchettes",
        concept:
          "Une fourchette a besoin de géométrie : deux cibles non défendues sur la même roue de cavalier ou diagonale de pion. Refuse la géométrie — garde tes pièces défendues et surveille les cases molles autour de ton roi.",
        mission: (s) =>
          `Tu as subi une fourchette ou double attaque ${s.motifCount} fois sur tes ${s.totalAnalyzed} dernières parties analysées.`,
        drill: "Dans ces positions, tu as permis une fourchette. Trouve le coup qui refuse la géométrie.",
        answerExplain:
          "Le bon coup casse la géométrie de la fourchette : il défend ou déplace l'une des deux cibles, et la double attaque ne gagne plus rien.",
        quiz: [
          {
            q: "De quoi toute fourchette a-t-elle besoin pour exister ?",
            choices: ["Deux cibles non défendues sur une géométrie", "Une dame active près du centre", "Une colonne ouverte pour les tours"],
            answerIdx: 0,
            explain: "Pas de pièces en l'air, pas de fourchette. Garde tes pièces défendues et la géométrie n'apparaît jamais.",
          },
        ],
        sourceLabel: "Tactiques Lichess — thème fourchette de cavalier",
      },
    },
  },
  {
    slug: "stop-mating-nets",
    theme: "allowed_mate",
    sourceUrl: "https://lichess.org/practice",
    overlays: { blackAttacks: true, whiteAttacks: true },
    maxExamples: 4,
    i18n: {
      en: {
        title: "Stop Walking Into Mating Nets",
        concept:
          "Most amateur mates are pattern mates: back rank, h-file battery, smothered ideas. The cure is one prophylactic habit — every few moves ask: 'if my opponent had two free moves, could they mate me?'",
        mission: (s) =>
          `You allowed a mating attack ${s.motifCount} times in your last ${s.totalAnalyzed} analyzed games.`,
        drill: "In these positions you allowed mate. Find the defensive resource.",
        answerExplain:
          "The defensive resource removes the mating pattern itself — an escape square, a defender, or a trade of the key attacker. Patterns die when one ingredient is missing.",
        quiz: [
          {
            q: "What is the cheapest insurance against back-rank mates?",
            choices: ["An escape square for the king", "Doubling rooks on an open file", "Trading off the enemy queen"],
            answerIdx: 0,
            explain: "One pawn move (h3/h6 style 'luft') removes the whole pattern for the rest of the game.",
          },
        ],
        sourceLabel: "Lichess practice — mating patterns",
      },
      fr: {
        title: "Arrête de marcher dans les filets de mat",
        concept:
          "La plupart des mats amateurs sont des mats de schéma : dernière rangée, batterie sur la colonne h, mat à l'étouffée. Le remède est une habitude prophylactique — tous les quelques coups, demande-toi : « si mon adversaire avait deux coups gratuits, pourrait-il me mater ? »",
        mission: (s) =>
          `Tu as subi une attaque de mat ${s.motifCount} fois sur tes ${s.totalAnalyzed} dernières parties analysées.`,
        drill: "Dans ces positions, tu as permis le mat. Trouve la ressource défensive.",
        answerExplain:
          "La ressource défensive supprime le schéma de mat lui-même — une case de fuite, un défenseur, ou l'échange de l'attaquant clé. Un schéma meurt dès qu'un ingrédient manque.",
        quiz: [
          {
            q: "Quelle est l'assurance la moins chère contre le mat du couloir ?",
            choices: ["Une case de fuite pour le roi", "Doubler les tours sur une colonne ouverte", "Échanger la dame adverse"],
            answerIdx: 0,
            explain: "Un seul coup de pion (h3/h6, le « luft ») élimine tout le schéma pour le reste de la partie.",
          },
        ],
        sourceLabel: "Lichess practice — schémas de mat",
      },
    },
  },
  {
    slug: "count-the-exchange",
    theme: "bad_trade",
    sourceUrl: "https://lichess.org/training",
    overlays: { hanging: true },
    maxExamples: 4,
    i18n: {
      en: {
        title: "Count Before You Take",
        concept:
          "Captures are arithmetic: attackers vs defenders, in value order. If the sequence ends with you down material, the capture is wrong no matter how natural it looks.",
        mission: (s) =>
          `Bad trades cost you material ${s.motifCount} times in your last ${s.totalAnalyzed} analyzed games.`,
        drill: "Count the capture sequences in these positions from your games — take or not?",
        answerExplain:
          "Count attackers vs defenders in value order: this move comes out ahead at the end of the sequence. If the count ends negative, the capture is wrong no matter how natural it looks.",
        quiz: [
          {
            q: "Before any capture on a contested square, what do you count?",
            choices: ["Attackers vs defenders, by value", "Pawns on each side of the board", "Tempi gained by each recapture"],
            answerIdx: 0,
            explain: "List attackers and defenders cheapest-first and play the sequence out mentally before taking.",
          },
        ],
        sourceLabel: "Lichess tactics trainer",
      },
      fr: {
        title: "Compte avant de prendre",
        concept:
          "Les prises, c'est de l'arithmétique : attaquants contre défenseurs, par ordre de valeur. Si la séquence se termine avec du matériel en moins pour toi, la prise est mauvaise, aussi naturelle qu'elle paraisse.",
        mission: (s) =>
          `Les mauvais échanges t'ont coûté du matériel ${s.motifCount} fois sur tes ${s.totalAnalyzed} dernières parties analysées.`,
        drill: "Compte les séquences de prises dans ces positions tirées de tes parties — prendre ou pas ?",
        answerExplain:
          "Compte attaquants contre défenseurs par ordre de valeur : ce coup ressort gagnant en fin de séquence. Si le compte finit négatif, la prise est mauvaise, aussi naturelle semble-t-elle.",
        quiz: [
          {
            q: "Avant toute prise sur une case disputée, que comptes-tu ?",
            choices: ["Attaquants contre défenseurs, par valeur", "Les pions de chaque côté de l'échiquier", "Les tempos gagnés par chaque reprise"],
            answerIdx: 0,
            explain: "Liste attaquants et défenseurs du moins cher au plus cher et joue la séquence mentalement avant de prendre.",
          },
        ],
        sourceLabel: "Entraîneur tactique Lichess",
      },
    },
  },
];

const BY_SLUG = new Map(TEMPLATES.map((t) => [t.slug, t]));
const BY_THEME = new Map(TEMPLATES.map((t) => [t.theme, t]));

function toExamples(puzzles: PuzzleRow[], theme: Motif | Motif[], n: number): LessonExample[] {
  const themes = Array.isArray(theme) ? theme : [theme];
  return puzzles
    .filter((p) => themes.includes(p.theme))
    .slice(0, n)
    .map((p) => ({
      fen: p.fen,
      user_side: p.user_side,
      solution_san: p.solution_san,
      reply_san: p.reply_san,
      source_url: p.source_url,
    }));
}

/** Interleave user moves and opponent replies into one playable line. */
function toLine(ex: LessonExample): string[] {
  const line: string[] = [];
  ex.solution_san.forEach((san, k) => {
    line.push(san);
    const reply = ex.reply_san?.[k];
    if (reply) line.push(reply);
  });
  return line;
}

/** Build (or rebuild) lessons from the weakness profile. Pure — caller persists. */
export function generateLessons(profile: WeaknessProfile, puzzles: PuzzleRow[]): GeneratedLesson[] {
  const out: GeneratedLesson[] = [];
  const now = new Date().toISOString();

  // Flagship lesson — always relevant when there's any material.
  const lof = toExamples(puzzles, ["hanging_piece", "missed_tactic"] as Motif[], 3);
  if (lof.length) {
    out.push({
      slug: "lines-of-force",
      theme: "lines_of_force",
      created_at: now,
      completed: false,
      examples: lof,
      stats: {
        totalAnalyzed: profile.totalAnalyzed,
        motifCount: profile.topMotifs.reduce((s, m) => s + m.count, 0),
        blundersPerGame: profile.blundersPerGame,
      },
    });
  }

  for (const { motif, count } of profile.topMotifs) {
    const template = BY_THEME.get(motif);
    if (!template) continue;
    const examples = toExamples(puzzles, motif, template.maxExamples);
    if (!examples.length) continue;
    out.push({
      slug: template.slug,
      theme: motif,
      created_at: now,
      completed: false,
      examples,
      stats: { totalAnalyzed: profile.totalAnalyzed, motifCount: count, blundersPerGame: profile.blundersPerGame },
    });
  }
  return out;
}

/** Render a stored lesson in the requested locale. */
export function renderLesson(lesson: GeneratedLesson, locale: Locale): (LessonContent & { title: string }) | null {
  const template = BY_SLUG.get(lesson.slug);
  if (!template) return null;
  const loc = template.i18n[locale];

  return {
    title: loc.title,
    concept: loc.concept,
    mission: loc.mission(lesson.stats),
    sections: [
      ...lesson.examples.map((ex, i) => ({
        type: "board" as const,
        heading: undefined,
        exampleIndex: i + 1,
        fen: ex.fen,
        orientation: ex.user_side,
        task: loc.drill,
        answerSan: ex.solution_san.slice(0, 1),
        answerLine: toLine(ex),
        explain: loc.answerExplain,
        overlays: template.overlays,
        sourceUrl: ex.source_url,
      })),
      { type: "quiz" as const, questions: loc.quiz },
    ],
    primarySource: { label: loc.sourceLabel, url: template.sourceUrl },
  };
}

export function lessonTitle(slug: string, locale: Locale): string {
  return BY_SLUG.get(slug)?.i18n[locale].title ?? slug;
}

export function lessonConcept(slug: string, locale: Locale): string {
  return BY_SLUG.get(slug)?.i18n[locale].concept ?? "";
}
