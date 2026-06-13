import type { AnalysisSummary, GameRow, Motif, Phase, WeaknessProfile } from "./types";

export interface DashboardStats {
  totalGames: number;
  winRate: number | null;
  avgAccuracy: number | null;
  blundersPerGame: number | null;
  analyzedCount: number;
  pendingCount: number;
  ratingSeries: { date: string; rating: number; platform: string; timeClass: string }[];
  recentGames: GameRow[];
  weaknesses: WeaknessProfile | null;
}

/** Pure aggregation — data comes from localStorage (see storage.ts). */
export function computeDashboardStats(games: GameRow[], analyses: Record<string, AnalysisSummary>): DashboardStats {
  const all = [...games].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
  const totalGames = all.length;
  const wins = all.filter((g) => g.result === "win").length;
  const draws = all.filter((g) => g.result === "draw").length;
  const winRate = totalGames ? Math.round(((wins + draws * 0.5) / totalGames) * 1000) / 10 : null;

  const summaries = Object.values(analyses);
  const analyzedCount = summaries.length;
  const pendingCount = all.filter((g) => g.analysis_status === "pending").length;

  const avgAccuracy = analyzedCount
    ? Math.round((summaries.reduce((s, a) => s + (a.accuracy || 0), 0) / analyzedCount) * 10) / 10
    : null;
  const blundersPerGame = analyzedCount
    ? Math.round((summaries.reduce((s, a) => s + a.blunders, 0) / analyzedCount) * 100) / 100
    : null;

  const ratingSeries = all
    .filter((g) => g.rated && g.user_rating)
    .map((g) => ({
      date: g.played_at,
      rating: g.user_rating as number,
      platform: g.platform,
      timeClass: g.time_class,
    }))
    .reverse();

  return {
    totalGames,
    winRate,
    avgAccuracy,
    blundersPerGame,
    analyzedCount,
    pendingCount,
    ratingSeries,
    recentGames: all.slice(0, 10),
    weaknesses: analyzedCount ? buildWeaknessProfile(all, summaries) : null,
  };
}

export function buildWeaknessProfile(games: GameRow[], summaries: AnalysisSummary[]): WeaknessProfile {
  const motifCounts = new Map<Motif, number>();
  const phaseAgg: Record<Phase, { blunders: number; moves: number }> = {
    opening: { blunders: 0, moves: 0 },
    middlegame: { blunders: 0, moves: 0 },
    endgame: { blunders: 0, moves: 0 },
  };

  for (const s of summaries) {
    for (const issue of s.issues) {
      if (issue.severity === "inaccuracy") continue;
      motifCounts.set(issue.motif, (motifCounts.get(issue.motif) ?? 0) + 1);
    }
    for (const phase of ["opening", "middlegame", "endgame"] as Phase[]) {
      phaseAgg[phase].blunders += s.byPhase[phase].blunders;
      phaseAgg[phase].moves += s.byPhase[phase].moves;
    }
  }

  const topMotifs = [...motifCounts.entries()]
    .filter(([m]) => m !== "other")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([motif, count]) => ({ motif, count }));

  let weakestPhase: WeaknessProfile["weakestPhase"] = null;
  for (const phase of ["opening", "middlegame", "endgame"] as Phase[]) {
    const { blunders, moves } = phaseAgg[phase];
    if (moves < 30) continue;
    const rate = blunders / moves;
    if (!weakestPhase || rate > weakestPhase.blunderRate) {
      weakestPhase = { phase, blunderRate: Math.round(rate * 1000) / 1000 };
    }
  }

  const byEco = new Map<string, { name: string | null; games: number; points: number }>();
  for (const g of games) {
    if (!g.eco) continue;
    const cur = byEco.get(g.eco) ?? { name: g.opening_name, games: 0, points: 0 };
    cur.games++;
    cur.points += g.result === "win" ? 1 : g.result === "draw" ? 0.5 : 0;
    if (!cur.name && g.opening_name) cur.name = g.opening_name;
    byEco.set(g.eco, cur);
  }
  const worstOpenings = [...byEco.entries()]
    .filter(([, v]) => v.games >= 5)
    .map(([eco, v]) => ({
      eco,
      name: v.name,
      games: v.games,
      score: Math.round((v.points / v.games) * 1000) / 10,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const analyzed = summaries.length;
  return {
    totalAnalyzed: analyzed,
    avgAccuracy: analyzed
      ? Math.round((summaries.reduce((s, a) => s + (a.accuracy || 0), 0) / analyzed) * 10) / 10
      : null,
    blundersPerGame: analyzed
      ? Math.round((summaries.reduce((s, a) => s + a.blunders, 0) / analyzed) * 100) / 100
      : 0,
    topMotifs,
    weakestPhase,
    worstOpenings,
  };
}
