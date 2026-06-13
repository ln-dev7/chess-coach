"use client";

import { useRef, useState } from "react";
import { Engine } from "@/lib/engine";
import { summarizeGame, type PositionEval } from "@/lib/analysis";
import { useI18n } from "@/lib/i18n";
import { parsePgn } from "@/lib/pgn";
import {
  loadGames,
  loadSettings,
  saveAnalysis,
  setGameStatus,
  upsertPuzzles,
} from "@/lib/storage";
import type { PuzzleRow } from "@/lib/types";

type Status = "idle" | "running" | "done" | "error";

export default function AnalysisRunner({
  pendingCount,
  onProgress,
}: {
  pendingCount: number;
  onProgress?: () => void;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>("idle");
  const [label, setLabel] = useState("");
  const [progress, setProgress] = useState(0);
  const stopRef = useRef(false);

  async function run() {
    setStatus("running");
    stopRef.current = false;
    const engine = new Engine();

    try {
      const settings = loadSettings();
      const games = loadGames()
        .filter((g) => g.analysis_status === "pending")
        .slice(0, settings.analyzeLastN);

      if (!games.length) {
        setStatus("done");
        setLabel(t.analysis.none);
        return;
      }
      await engine.init();

      for (let gi = 0; gi < games.length; gi++) {
        if (stopRef.current) break;
        const game = games[gi];
        const parsed = parsePgn(game.pgn);
        if (!parsed || parsed.moves.length < 8) {
          setGameStatus(game.id, "skipped");
          continue;
        }

        const evals: PositionEval[] = [];
        for (let i = 0; i < parsed.fens.length; i++) {
          if (stopRef.current) break;
          evals.push(await engine.evaluate(parsed.fens[i], settings.engineMovetimeMs));
          setLabel(
            `${t.analysis.progress(gi + 1, games.length)} — ${t.analysis.moveProgress(i + 1, parsed.fens.length)}`
          );
          setProgress(Math.round(((gi + (i + 1) / parsed.fens.length) / games.length) * 100));
        }
        if (stopRef.current) break;

        const { summary, puzzles } = summarizeGame({
          fens: parsed.fens,
          moves: parsed.moves,
          userColor: game.user_color,
          evals,
          engineLabel: `movetime ${settings.engineMovetimeMs}ms`,
        });

        saveAnalysis(game.id, summary);
        const rows: PuzzleRow[] = puzzles.map((p, k) => ({
          ...p,
          id: `${game.id}#${k}:${p.fen.split(" ")[0]}`,
          game_id: game.id,
          source_url: game.url,
          attempts: 0,
          solved: false,
          created_at: new Date().toISOString(),
        }));
        upsertPuzzles(rows);
        setGameStatus(game.id, "done", summary.accuracy);
        onProgress?.();
      }

      setStatus("done");
      setLabel(t.analysis.none);
    } catch (e) {
      setStatus("error");
      setLabel((e as Error).message);
    } finally {
      engine.destroy();
      onProgress?.();
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-foreground">{t.analysis.title}</h2>
        <span className="text-xs text-muted-foreground">
          {pendingCount} {t.dashboard.pendingAnalysis}
        </span>
      </div>

      {status === "running" ? (
        <>
          <div className="h-2 rounded-full bg-accent overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{label}</span>
            <button onClick={() => (stopRef.current = true)} className="text-red-500 hover:text-red-600 dark:text-red-300">
              {t.analysis.stop}
            </button>
          </div>
          <p className="text-xs text-muted-foreground/70">{t.analysis.keepOpen}</p>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={run}
            disabled={pendingCount === 0}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition"
          >
            {t.analysis.start}
          </button>
          <span className="text-sm text-muted-foreground">{label || (pendingCount === 0 ? t.analysis.none : "")}</span>
        </div>
      )}
    </div>
  );
}
