"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { ChevronLeft, ChevronRight, Play, SkipBack, SkipForward, Sparkles, Square, Telescope } from "lucide-react";
import Board from "./Board";
import SpeakButton from "./SpeakButton";
import { Engine } from "@/lib/engine";
import { useI18n } from "@/lib/i18n";
import { requestMasterAnnotation } from "@/lib/masters-client";
import { useCoachAvailability } from "@/lib/coach-client";
import { useMasterAnnotations } from "@/lib/store";
import { addMasterAnnotation } from "@/lib/storage";
import { parsePgn } from "@/lib/pgn";
import type { MasterGame } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const EXPLORE_PLIES = 8;

interface EngineStep {
  fen: string;
  san: string;
  cpWhite: number;
}

export default function MasterGameView({ game }: { game: MasterGame }) {
  const { t, locale } = useI18n();
  const parsed = useMemo(() => parsePgn(game.pgn), [game.pgn]);
  const annotations = useMasterAnnotations();
  const annotation = annotations.find((a) => a.gameId === game.id && a.locale === locale) ?? null;
  const ai = useCoachAvailability();

  const [plyIdx, setPlyIdx] = useState(0); // plies played so far (0 = start)
  const [playing, setPlaying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  // On-demand engine line from the current position (the only place evals appear).
  const [engineLine, setEngineLine] = useState<EngineStep[] | null>(null);
  const [computing, setComputing] = useState(false);
  const cancelRef = useRef(false);
  const stopAutoRef = useRef(false); // set true to interrupt auto-play

  useEffect(() => {
    cancelRef.current = false;
    return () => {
      cancelRef.current = true;
    };
  }, []);

  if (!parsed || !parsed.moves.length) {
    return <p className="text-muted-foreground">{t.masters.unreadable}</p>;
  }

  const { fens, moves } = parsed;
  const total = moves.length;
  const fen = fens[plyIdx];
  const lastUci = plyIdx > 0 ? moves[plyIdx - 1].uci : null;
  const lastMove = lastUci ? { from: lastUci.slice(0, 2), to: lastUci.slice(2, 4) } : null;
  const currentNote = annotation?.notes.find((n) => n.ply === plyIdx) ?? null;

  function goTo(i: number) {
    const clamped = Math.max(0, Math.min(total, i));
    setPlyIdx(clamped);
    setEngineLine(null);
  }

  function stopAutoplay() {
    stopAutoRef.current = true;
    setPlaying(false);
  }

  async function autoplay() {
    if (playing) return;
    stopAutoRef.current = false;
    setPlaying(true);
    setEngineLine(null);
    let i = plyIdx >= total ? 0 : plyIdx;
    if (i === 0) setPlyIdx(0);
    while (i < total) {
      await sleep(900);
      if (cancelRef.current || stopAutoRef.current) break;
      i += 1;
      setPlyIdx(i);
    }
    setPlaying(false);
  }

  async function exploreLine() {
    if (computing) return;
    setComputing(true);
    const engine = new Engine();
    try {
      await engine.init();
      const c = new Chess(fen);
      const out: EngineStep[] = [];
      while (out.length < EXPLORE_PLIES && !c.isGameOver()) {
        if (cancelRef.current) break;
        const ev = await engine.evaluate(c.fen(), 300);
        if (!ev.bestUci) break;
        let m;
        try {
          m = c.move({ from: ev.bestUci.slice(0, 2), to: ev.bestUci.slice(2, 4), promotion: ev.bestUci[4] });
        } catch {
          break;
        }
        if (!m) break;
        out.push({ fen: c.fen(), san: m.san, cpWhite: ev.cpWhite });
      }
      if (!cancelRef.current && out.length) setEngineLine(out);
    } catch {
      /* engine unavailable */
    } finally {
      engine.destroy();
      setComputing(false);
    }
  }

  async function generate() {
    if (generating) return;
    setGenerating(true);
    setGenError("");
    try {
      const result = await requestMasterAnnotation({ game, locale });
      addMasterAnnotation(result);
    } catch (e) {
      setGenError((e as Error).message || t.masters.genError);
    } finally {
      setGenerating(false);
    }
  }

  const studyingName = game.studySide === "w" ? game.white : game.black;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Board + controls */}
      <div className="flex flex-col gap-3 lg:w-[420px] lg:flex-none">
        <Board
          fen={fen}
          lastMove={lastMove}
          orientation={game.studySide}
          interactive={false}
          showOverlayControls={false}
        />

        <div className="flex items-center justify-center gap-2">
          <StepBtn onClick={() => goTo(0)} disabled={plyIdx === 0} label={t.masters.first}>
            <SkipBack className="size-4" />
          </StepBtn>
          <StepBtn onClick={() => goTo(plyIdx - 1)} disabled={plyIdx === 0} label={t.masters.prev}>
            <ChevronLeft className="size-4" />
          </StepBtn>
          <button
            onClick={playing ? stopAutoplay : autoplay}
            disabled={!playing && plyIdx >= total}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 transition",
              playing
                ? "border-red-500/50 text-red-600 dark:text-red-300 hover:bg-red-500/10 animate-pulse"
                : "border-emerald-500/50 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/10",
            ].join(" ")}
          >
            {playing ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
            {playing ? t.masters.stopAutoplay : t.masters.autoplay}
          </button>
          <StepBtn onClick={() => goTo(plyIdx + 1)} disabled={plyIdx >= total} label={t.masters.next}>
            <ChevronRight className="size-4" />
          </StepBtn>
          <StepBtn onClick={() => goTo(total)} disabled={plyIdx >= total} label={t.masters.last}>
            <SkipForward className="size-4" />
          </StepBtn>
        </div>

        <p className="text-center text-xs text-muted-foreground tabular-nums">
          {plyIdx === 0 ? t.masters.startPosition : `${Math.ceil(plyIdx / 2)}${plyIdx % 2 ? "." : "…"} ${moves[plyIdx - 1].san}`}
          {" · "}
          {plyIdx}/{total}
        </p>

        {/* Move list */}
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-3 max-h-44 overflow-y-auto">
          {moves.map((m, i) => (
            <button
              key={i}
              onClick={() => goTo(i + 1)}
              className={[
                "rounded px-1.5 py-0.5 text-[11px] font-mono transition",
                plyIdx === i + 1 ? "bg-emerald-600 text-white" : "text-foreground/80 hover:bg-accent",
              ].join(" ")}
            >
              {i % 2 === 0 ? `${i / 2 + 1}.` : ""}
              {m.san}
            </button>
          ))}
        </div>

        {/* On-demand engine analysis (the only evals on the page) */}
        {engineLine === null ? (
          <button
            onClick={exploreLine}
            disabled={computing}
            className={[
              "self-start inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-ring/60 disabled:opacity-60 transition",
              computing ? "animate-pulse" : "",
            ].join(" ")}
          >
            <Telescope className="size-3.5" />
            {computing ? t.masters.computing : t.masters.engineLine}
          </button>
        ) : (
          <div className="rounded-xl border border-border bg-card p-3 text-xs">
            <p className="text-muted-foreground mb-1">{t.masters.engineBest}</p>
            <p className="font-mono text-foreground/90">
              {engineLine.map((s) => s.san).join(" ")}
            </p>
            <p className="text-muted-foreground mt-1">
              {t.masters.evaluation}: {formatEval(engineLine[0].cpWhite)}
            </p>
          </div>
        )}
      </div>

      {/* Reasoning */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{game.title}</h2>
          <p className="text-sm text-muted-foreground">
            {game.white} – {game.black}
            {game.event ? ` · ${game.event}` : ""}
            {game.year ? ` · ${game.year}` : ""}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1">{t.masters.studyingAs(studyingName)}</p>
        </div>

        {!annotation ? (
          <div className="rounded-xl border border-violet-500/40 bg-violet-500/5 p-5 flex flex-col gap-3">
            <p className="text-sm text-foreground/90">{t.masters.noReasoningYet}</p>
            {ai.ready && !ai.available ? (
              <p className="text-sm text-amber-600 dark:text-amber-200">{t.lessons.aiUnavailable}</p>
            ) : (
              <button
                onClick={generate}
                disabled={generating || !ai.available}
                className="self-start inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition"
              >
                <Sparkles className="size-4" />
                {generating ? t.masters.generating : t.masters.generateReasoning}
              </button>
            )}
            {genError && <p className="text-sm text-red-500">{genError}</p>}
          </div>
        ) : (
          <>
            {plyIdx === 0 ? (
              <div className="rounded-xl border-l-4 border-violet-500 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-foreground/90 leading-relaxed">{annotation.intro}</p>
                  <SpeakButton text={annotation.intro} />
                </div>
              </div>
            ) : currentNote ? (
              <div className="rounded-xl border-l-4 border-emerald-500 bg-card p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {t.masters.moveLabel(Math.ceil(plyIdx / 2), moves[plyIdx - 1].san)}
                  </p>
                  <SpeakButton text={currentNote.reasoning} />
                </div>
                <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{currentNote.reasoning}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">{t.masters.noteForMove}</p>
            )}
            <button
              onClick={generate}
              disabled={generating}
              className="self-start text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
            >
              {generating ? t.masters.generating : t.masters.regenerate}
            </button>
            {genError && <p className="text-sm text-red-500">{genError}</p>}
          </>
        )}

        {game.sourceUrl && (
          <a href={game.sourceUrl} target="_blank" className="text-xs text-muted-foreground underline">
            {t.masters.source}
          </a>
        )}
      </div>
    </div>
  );
}

function StepBtn({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex w-9 h-9 items-center justify-center rounded-lg border border-input text-foreground/80 hover:border-ring/60 disabled:opacity-30 transition"
    >
      {children}
    </button>
  );
}

function formatEval(cpWhite: number): string {
  if (Math.abs(cpWhite) >= 9000) {
    const mate = Math.ceil((10000 - Math.abs(cpWhite)) / 2);
    return `#${cpWhite > 0 ? "" : "-"}${mate}`;
  }
  const pawns = cpWhite / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(1)}`;
}
