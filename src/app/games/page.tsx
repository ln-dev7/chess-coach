"use client";

import GamesTable from "@/components/GamesTable";
import { useI18n } from "@/lib/i18n";
import { useHydrated } from "@/lib/use-hydrated";
import { loadGames } from "@/lib/storage";

export default function GamesPage() {
  const { t } = useI18n();
  const hydrated = useHydrated();
  const games = hydrated ? loadGames().slice(0, 300) : null;

  if (!games) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">{t.games.title}</h1>
      {games.length === 0 ? <p className="text-muted-foreground">{t.dashboard.noData}</p> : <GamesTable games={games} showStatus />}
    </main>
  );
}
