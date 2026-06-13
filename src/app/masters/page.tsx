"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import MasterGameView from "@/components/MasterGameView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchChesscomGames } from "@/lib/fetchers/chesscom";
import { fetchLichessGames } from "@/lib/fetchers/lichess";
import { useI18n } from "@/lib/i18n";
import { MASTER_GAMES } from "@/lib/masters-catalog";
import type { GameRow, MasterGame } from "@/lib/types";

type Platform = "lichess" | "chesscom";

interface Preset {
  label: string;
  handle: string;
}

const PRESETS: Record<Platform, Preset[]> = {
  lichess: [
    { label: "Carlsen", handle: "DrNykterstein" },
    { label: "Firouzja", handle: "alireza2003" },
    { label: "Nakamura", handle: "Hikaru" },
    { label: "Artemiev", handle: "Konevlad" },
    { label: "Caruana", handle: "STL_Caruana" },
    { label: "Nepomniachtchi", handle: "Vladimirovich9000" },
    { label: "Vachier-Lagrave", handle: "LyonBeast" },
    { label: "Sarin", handle: "nihalsarin" },
    { label: "Tang", handle: "penguingm1" },
    { label: "Naroditsky", handle: "RebeccaHarris" },
    { label: "Rosen", handle: "EricRosen" },
    { label: "Zhigalko", handle: "Zhigalko_Sergei" },
  ],
  chesscom: [
    { label: "Carlsen", handle: "MagnusCarlsen" },
    { label: "Nakamura", handle: "Hikaru" },
    { label: "Caruana", handle: "FabianoCaruana" },
    { label: "Firouzja", handle: "FirouzjaAlireza" },
    { label: "Nepomniachtchi", handle: "LachesisQ" },
    { label: "Naroditsky", handle: "DanielNaroditsky" },
    { label: "So", handle: "GMWSO" },
    { label: "Giri", handle: "AnishGiri" },
    { label: "Gukesh", handle: "GukeshDommaraju" },
    { label: "Aronian", handle: "LevonAronian" },
    { label: "Kasparov", handle: "GarryKasparov" },
    { label: "Rapport", handle: "Rapport_Richard" },
  ],
};

/** Convert an imported GameRow (the searched player's game) into a MasterGame. */
function toMasterGame(g: GameRow, player: string): MasterGame {
  const opponent = g.opponent_name ?? "?";
  const white = g.user_color === "w" ? player : opponent;
  const black = g.user_color === "w" ? opponent : player;
  return {
    id: g.id,
    pgn: g.pgn,
    title: `${white} – ${black}`,
    white,
    black,
    event: null,
    year: new Date(g.played_at).getFullYear() || 0,
    result: "*",
    studySide: g.user_color, // study the searched player's plan
    tags: [],
    sourceUrl: g.url,
    teaser: { en: "", fr: "" },
  };
}

export default function MastersPage() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");

  // Importer state
  const [platform, setPlatform] = useState<Platform>("lichess");
  const [handle, setHandle] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [imported, setImported] = useState<MasterGame[] | null>(null);
  const [selected, setSelected] = useState<MasterGame | null>(null);

  const games = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MASTER_GAMES;
    return MASTER_GAMES.filter((g) =>
      [g.title, g.white, g.black, g.event ?? "", ...g.tags].join(" ").toLowerCase().includes(q)
    );
  }, [query]);

  async function runImport() {
    const player = handle.trim();
    if (!player || importing) return;
    setImporting(true);
    setImportError("");
    setSelected(null);
    try {
      const rows = platform === "lichess" ? await fetchLichessGames(player, 30) : await fetchChesscomGames(player, 30);
      if (!rows.length) {
        setImportError(t.masters.importEmpty);
        setImported([]);
      } else {
        setImported(rows.map((r) => toMasterGame(r, player)));
      }
    } catch (e) {
      setImportError((e as Error).message || t.masters.importEmpty);
    } finally {
      setImporting(false);
    }
  }

  // Inline ephemeral viewer for an imported game.
  if (selected) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 flex flex-col gap-6">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          ← {t.masters.backToImport}
        </button>
        <MasterGameView game={selected} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{t.masters.title}</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">{t.masters.sub}</p>
      </div>

      {/* Search */}
      <label className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.masters.search}
          className="h-10 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none"
        />
      </label>

      {/* Curated catalog */}
      {games.length === 0 ? (
        <p className="text-muted-foreground">{t.masters.noMatch}</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {games.map((g) => (
            <li key={g.id}>
              <Link
                href={`/masters/${g.id}`}
                className="block h-full rounded-xl border border-border bg-card p-5 hover:border-ring/60 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium text-foreground">{g.title}</h2>
                  {g.year > 0 && <span className="text-xs text-muted-foreground shrink-0">{g.year}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {g.white} – {g.black}
                </p>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{g.teaser[locale]}</p>
                {g.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {g.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Import a player's real games from chess.com / lichess */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium text-foreground">{t.masters.importTitle}</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">{t.masters.importSub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lichess">Lichess</SelectItem>
              <SelectItem value="chesscom">Chess.com</SelectItem>
            </SelectContent>
          </Select>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runImport()}
            placeholder={t.masters.importPlaceholder}
            className="h-9 flex-1 min-w-[160px] rounded-lg border border-input bg-transparent px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none"
          />
          <button
            onClick={runImport}
            disabled={!handle.trim() || importing}
            className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 px-4 h-9 text-sm font-medium transition"
          >
            {importing ? t.masters.importing : t.masters.importButton}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS[platform].map((p) => (
            <button
              key={p.handle}
              onClick={() => setHandle(p.handle)}
              title={p.handle}
              className="rounded-full border border-input px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-ring/60 transition"
            >
              {p.label}
            </button>
          ))}
        </div>

        {importError && <p className="text-sm text-red-500">{importError}</p>}

        {imported && imported.length > 0 && (
          <ul className="grid sm:grid-cols-2 gap-2">
            {imported.map((g) => (
              <li key={g.id}>
                <button
                  onClick={() => setSelected(g)}
                  className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-ring/60 transition"
                >
                  <p className="text-sm text-foreground">{g.title}</p>
                  {g.year > 0 && <p className="text-xs text-muted-foreground">{g.year}</p>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
