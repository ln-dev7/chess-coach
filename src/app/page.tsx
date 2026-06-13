"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import AnalysisRunner from "@/components/AnalysisRunner";
import GamesTable from "@/components/GamesTable";
import RatingChart from "@/components/RatingChart";
import SyncButton from "@/components/SyncButton";
import { useI18n } from "@/lib/i18n";
import { computeDashboardStats } from "@/lib/stats";
import { useAnalyses, useGames, useSettings, useStoreHydrated } from "@/lib/store";

export default function DashboardPage() {
  const { t } = useI18n();
  const hydrated = useStoreHydrated();
  const games = useGames();
  const analyses = useAnalyses();
  const settings = useSettings();

  // Reactive: sync/analysis write to the store, so this recomputes on its own.
  const stats = hydrated ? computeDashboardStats(games, analyses) : null;

  if (!stats) return null;

  const accounts = [
    settings.chesscomUsername && `${settings.chesscomUsername} (Chess.com)`,
    settings.lichessUsername && `${settings.lichessUsername} (Lichess)`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 flex flex-col gap-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t.dashboard.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.app.tagline}</p>
          {accounts && (
            <p className="text-xs text-muted-foreground/80 mt-2">
              {t.dashboard.accounts} <span className="text-foreground/80">{accounts}</span>{" "}
              <Link href="/settings" className="underline hover:text-foreground">
                ({t.dashboard.accountsEdit})
              </Link>
            </p>
          )}
        </div>
        <SyncButton />
      </div>

      {stats.totalGames === 0 ? (
        <p className="text-muted-foreground">{t.dashboard.noData}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={t.dashboard.games}
              value={String(stats.totalGames)}
              sub={`${stats.analyzedCount} ${t.dashboard.analyzed}`}
            />
            <StatCard label={t.dashboard.winRate} value={stats.winRate != null ? `${stats.winRate}%` : "—"} />
            <StatCard label={t.dashboard.accuracy} value={stats.avgAccuracy != null ? `${stats.avgAccuracy}%` : "—"} />
            <StatCard
              label={t.dashboard.blundersPerGame}
              value={stats.blundersPerGame != null ? String(stats.blundersPerGame) : "—"}
            />
          </div>

          <AnalysisRunner pendingCount={stats.pendingCount} />

          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-foreground">{t.dashboard.progression}</h2>
              <LessonsLink label={t.nav.lessons} />
            </div>
            <RatingChart series={stats.ratingSeries} />
          </section>

          {stats.weaknesses && stats.weaknesses.topMotifs.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-medium text-foreground mb-4">{t.dashboard.weaknesses}</h2>
              <ul className="flex flex-col gap-3">
                {stats.weaknesses.topMotifs.map((m, i) => (
                  <li key={m.motif} className="flex items-center gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90">{t.motifs[m.motif] ?? m.motif}</span>
                    <span className="text-muted-foreground">× {m.count}</span>
                  </li>
                ))}
                {stats.weaknesses.weakestPhase && (
                  <li className="text-sm text-muted-foreground pt-2 border-t border-border">
                    {t.dashboard.weakestPhase}:{" "}
                    <strong className="text-foreground">{t.phases[stats.weaknesses.weakestPhase.phase]}</strong> (
                    {Math.round(stats.weaknesses.weakestPhase.blunderRate * 100)}% {t.dashboard.blunderRate})
                  </li>
                )}
              </ul>
              <div className="mt-4 flex gap-4">
                <Link href="/lessons" className="text-sm text-emerald-600 dark:text-emerald-400 underline">
                  {t.nav.lessons} →
                </Link>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-foreground">{t.dashboard.recentGames}</h2>
              <LessonsLink label={t.nav.lessons} />
            </div>
            <GamesTable games={stats.recentGames} />
          </section>
        </>
      )}
    </main>
  );
}

function LessonsLink({ label }: { label: string }) {
  return (
    <Link
      href="/lessons"
      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/50 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-300 hover:bg-violet-500/10 transition"
    >
      <BookOpen className="size-3.5" />
      {label}
    </Link>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
