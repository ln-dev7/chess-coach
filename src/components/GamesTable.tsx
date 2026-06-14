"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CometSpinner } from "@/components/ui/comet-spinner";
import { requestAiLesson, useCoachAvailability } from "@/lib/coach-client";
import { buildDossier } from "@/lib/dossier";
import { useI18n } from "@/lib/i18n";
import { addAiLesson, loadAiLessons, loadAnalyses, loadGames } from "@/lib/storage";
import type { AiLessonRow, GameRow } from "@/lib/types";

export function ResultBadge({ result }: { result: GameRow["result"] }) {
  const { t } = useI18n();
  const cls =
    result === "win"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : result === "loss"
      ? "bg-red-500/15 text-red-600 dark:text-red-400"
      : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{t.games.results[result]}</span>;
}

/** Book button: asks the AI coach for a post-mortem lesson on ONE game. Only one at a time. */
function GameLessonButton({
  game,
  busyId,
  setBusyId,
}: {
  game: GameRow;
  busyId: string | null;
  setBusyId: (id: string | null) => void;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const analyzed = game.analysis_status === "done";
  const isBusy = busyId === game.id;
  const locked = busyId !== null && !isBusy;

  async function generate() {
    if (!analyzed || busyId !== null) return;
    setBusyId(game.id);
    try {
      const summary = loadAnalyses()[game.id];
      if (!summary) throw new Error(t.games.analyzeFirst);
      const dossier = buildDossier(loadGames(), { [game.id]: summary });
      const lesson = await requestAiLesson({
        dossier,
        locale,
        pastLessonTitles: loadAiLessons().map((l) => l.title),
        focus: `single-game post-mortem vs ${game.opponent_name ?? "?"} (${game.result}, ${game.opening_name ?? game.eco ?? "unknown opening"})`,
      });
      const row: AiLessonRow = {
        id: `ai-${Date.now()}`,
        locale,
        created_at: new Date().toISOString(),
        completed: false,
        title: lesson.title,
        content: lesson,
      };
      addAiLesson(row);
      setBusyId(null);
      router.push(`/lessons/${row.id}`);
    } catch (e) {
      console.error(e);
      setBusyId(null);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={generate}
          disabled={!analyzed || locked || isBusy}
          aria-label={t.games.aiLesson}
          className={[
            "inline-flex items-center justify-center rounded-md p-1.5 transition",
            isBusy
              ? "text-violet-500"
              : analyzed && !locked
              ? "text-violet-500 dark:text-violet-400 hover:bg-violet-500/10"
              : "text-muted-foreground/40 cursor-not-allowed",
          ].join(" ")}
        >
          {isBusy ? <CometSpinner className="size-3" /> : <BookOpen className="size-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {isBusy ? t.games.generatingLesson : analyzed ? t.games.aiLesson : t.games.analyzeFirst}
      </TooltipContent>
    </Tooltip>
  );
}

export default function GamesTable({ games, showStatus = false }: { games: GameRow[]; showStatus?: boolean }) {
  const { t, locale } = useI18n();
  const { available: aiConfigured } = useCoachAvailability();
  const [busyId, setBusyId] = useState<string | null>(null);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4 font-medium">{t.games.date}</th>
              <th className="py-2 pr-4 font-medium">{t.games.opponent}</th>
              <th className="py-2 pr-4 font-medium">{t.games.result}</th>
              <th className="py-2 pr-4 font-medium">{t.games.opening}</th>
              <th className="py-2 pr-4 font-medium">{t.games.accuracy}</th>
              {showStatus && <th className="py-2 pr-4 font-medium">{t.games.status}</th>}
              {aiConfigured && <th className="py-2 font-medium" aria-label={t.games.aiLesson} />}
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id} className="border-t border-border text-foreground/90">
                <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                  {new Date(g.played_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}
                </td>
                <td className="py-2 pr-4">
                  {g.url ? (
                    <a href={g.url} target="_blank" className="hover:underline">
                      {g.opponent_name ?? "?"}
                    </a>
                  ) : (
                    g.opponent_name ?? "?"
                  )}
                  <span className="text-muted-foreground/70"> ({g.opponent_rating ?? "?"})</span>
                </td>
                <td className="py-2 pr-4">
                  <ResultBadge result={g.result} />
                </td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {busyId === g.id ? (
                    <span className="inline-flex items-center text-violet-500 dark:text-violet-400 gap-3">
                      <CometSpinner className="size-3" />
                      <span className="inline-block">{t.games.generatingLesson}</span>
                    </span>
                  ) : (
                    g.opening_name ?? g.eco ?? "—"
                  )}
                </td>
                <td className="py-2 pr-4 text-muted-foreground">{g.accuracy_user ? `${g.accuracy_user}%` : "—"}</td>
                {showStatus && <td className="py-2 pr-4 text-muted-foreground">{g.analysis_status}</td>}
                {aiConfigured && (
                  <td className="py-1">
                    <GameLessonButton game={g} busyId={busyId} setBusyId={setBusyId} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
