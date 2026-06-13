"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { ChevronLeft, ChevronRight, Play, Telescope } from "lucide-react";
import Board from "./Board";
import { Engine } from "@/lib/engine";
import { useI18n } from "@/lib/i18n";
import { renderLesson } from "@/lib/lessons";
import { useLessonSounds } from "@/lib/sound/lesson-sounds";
import { setAiLessonCompleted, setLessonCompleted } from "@/lib/storage";
import type {
  AiLessonRow,
  GeneratedLesson,
  LessonContent,
  LessonSectionBoard,
  LessonSectionQuiz,
} from "@/lib/types";

/** Template-based lesson (FR/EN rendered from stored data). */
export default function LessonView({ lesson }: { lesson: GeneratedLesson }) {
  const { locale } = useI18n();
  const c = renderLesson(lesson, locale);
  if (!c) return null;
  return (
    <LessonContentView
      title={c.title}
      content={c}
      initialCompleted={lesson.completed}
      onComplete={() => setLessonCompleted(lesson.slug, true)}
    />
  );
}

/** Lesson written by the AI coach. */
export function AiLessonView({ lesson }: { lesson: AiLessonRow }) {
  const { t } = useI18n();
  return (
    <LessonContentView
      title={lesson.title}
      content={lesson.content}
      badge={t.lessons.aiBadge}
      note={t.lessons.aiNote}
      initialCompleted={lesson.completed}
      onComplete={() => setAiLessonCompleted(lesson.id, true)}
    />
  );
}

function LessonContentView({
  title,
  content,
  badge,
  note,
  initialCompleted,
  onComplete,
}: {
  title: string;
  content: LessonContent;
  badge?: string;
  note?: string;
  initialCompleted: boolean;
  onComplete: () => void;
}) {
  const { t } = useI18n();
  const sounds = useLessonSounds();
  const [completed, setCompleted] = useState(initialCompleted);

  function markDone() {
    setCompleted(true);
    sounds.complete();
    onComplete();
  }

  return (
    <article className="flex flex-col gap-10 max-w-3xl">
      <header className="flex flex-col gap-4">
        {badge && (
          <span className="self-start rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-500/40 px-3 py-1 text-xs font-medium">
            {badge}
          </span>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <div className="rounded-xl border-l-4 border-emerald-500 bg-card p-5">
          <p className="text-foreground leading-relaxed">
            <strong className="text-emerald-600 dark:text-emerald-400">{t.lessons.mentalModel}: </strong>
            {content.concept}
          </p>
        </div>
        <p className="text-sm text-muted-foreground italic leading-relaxed">{content.mission}</p>
        {note && <p className="text-xs text-muted-foreground/70">{note}</p>}
      </header>

      {content.sections.map((s, i) => {
        if (s.type === "text") {
          return (
            <section key={i} className="flex flex-col gap-2">
              {s.heading && <h2 className="text-xl font-medium text-foreground">{s.heading}</h2>}
              <p className="text-foreground/90 leading-relaxed">{s.body}</p>
            </section>
          );
        }
        if (s.type === "board") return <BoardSection key={i} section={s} />;
        if (s.type === "quiz") return <QuizSection key={i} section={s} />;
        return null;
      })}

      <footer className="flex flex-col gap-4 border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">
          {t.lessons.primarySource}:{" "}
          <a href={content.primarySource.url} target="_blank" className="text-emerald-600 dark:text-emerald-400 underline">
            {content.primarySource.label}
          </a>
        </p>
        <p className="text-sm text-muted-foreground italic">{t.lessons.askMore}</p>
        <button
          onClick={markDone}
          disabled={completed}
          className="self-start rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition"
        >
          {completed ? `✓ ${t.lessons.completed}` : t.lessons.markDone}
        </button>
      </footer>
    </article>
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One position of the engine exploration line. */
interface LineStep {
  fen: string;
  lastMove: { from: string; to: string } | null;
  san: string | null;
}

const EXPLORE_PLIES = 10; // 5 full moves, both sides

function BoardSection({ section }: { section: LessonSectionBoard }) {
  const { t } = useI18n();
  const sounds = useLessonSounds();
  const [state, setState] = useState<"idle" | "right" | "wrong">("idle");
  const [fen, setFen] = useState(section.fen);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [boardKey, setBoardKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Engine exploration: best play for BOTH sides, computed on demand.
  const [steps, setSteps] = useState<LineStep[] | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [computing, setComputing] = useState<number | null>(null);
  const cancelRef = useRef(false);
  const clean = (s: string) => s.replace(/[+#?!]/g, "");

  useEffect(() => {
    // Reset on (re)mount — React StrictMode mounts/unmounts/remounts in dev,
    // and a stale `true` here silently kills the playback loop.
    cancelRef.current = false;
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const line = section.answerLine?.length ? section.answerLine : section.answerSan ?? [];

  /** Replay the full continuation from the initial position, animated. */
  async function playLine() {
    if (!line.length || playing) return;
    setPlaying(true);
    setFen(section.fen);
    setLastMove(null);
    setBoardKey((k) => k + 1);
    const c = new Chess(section.fen);
    for (const san of line) {
      await sleep(700);
      if (cancelRef.current) break;
      let m;
      try {
        m = c.move(san);
      } catch {
        break;
      }
      if (!m) break;
      setFen(c.fen());
      setLastMove({ from: m.from, to: m.to });
    }
    setPlaying(false);
  }

  /**
   * Build the engine line on demand: the validated best move first, then
   * Stockfish's best move for EACH side alternately, up to EXPLORE_PLIES.
   */
  async function exploreLine() {
    if (computing !== null) return;
    setComputing(0);
    const engine = new Engine();
    try {
      await engine.init();
      const c = new Chess(section.fen);
      const out: LineStep[] = [{ fen: section.fen, lastMove: null, san: null }];

      // Ply 1 = the lesson's validated answer, for continuity with the drill.
      if (section.answerSan?.[0]) {
        const m = c.move(section.answerSan[0]);
        if (m) out.push({ fen: c.fen(), lastMove: { from: m.from, to: m.to }, san: m.san });
      }

      while (out.length <= EXPLORE_PLIES && !c.isGameOver()) {
        if (cancelRef.current) break;
        setComputing(out.length);
        const ev = await engine.evaluate(c.fen(), 300);
        if (!ev.bestUci) break;
        let m;
        try {
          m = c.move({ from: ev.bestUci.slice(0, 2), to: ev.bestUci.slice(2, 4), promotion: ev.bestUci[4] });
        } catch {
          break;
        }
        if (!m) break;
        out.push({ fen: c.fen(), lastMove: { from: m.from, to: m.to }, san: m.san });
      }

      if (!cancelRef.current && out.length > 1) {
        setSteps(out);
        setStepIdx(1); // land on the first move, animated
        setFen(out[1].fen);
        setLastMove(out[1].lastMove);
        setBoardKey((k) => k + 1);
      }
    } catch {
      /* engine unavailable — leave the replay button as fallback */
    } finally {
      engine.destroy();
      setComputing(null);
    }
  }

  function goTo(i: number) {
    if (!steps) return;
    const clamped = Math.max(0, Math.min(steps.length - 1, i));
    setStepIdx(clamped);
    setFen(steps[clamped].fen);
    setLastMove(steps[clamped].lastMove);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-medium text-foreground">
        {section.heading ?? (section.exampleIndex ? t.lessons.fromYourGame(section.exampleIndex) : "")}
      </h2>

      {section.theory && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-foreground/90 leading-relaxed">
            <strong className="text-emerald-600 dark:text-emerald-400">📖 {t.lessons.theory}: </strong>
            {section.theory}
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{section.task}</p>
      <Board
        key={boardKey}
        fen={fen}
        lastMove={lastMove}
        orientation={section.orientation}
        interactive={Boolean(section.answerSan?.length) && state !== "right" && !playing}
        defaultOverlays={section.overlays}
        onTryMove={
          section.answerSan?.length
            ? (san) => {
                const ok = section.answerSan!.some((a) => clean(a) === clean(san));
                setState(ok ? "right" : "wrong");
                if (ok) sounds.correct();
                else sounds.wrong();
                return ok;
              }
            : undefined
        }
      />

      {state === "right" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ {t.lessons.correct}</p>

          {section.playedSan && (
            <p className="text-sm text-muted-foreground">
              {t.lessons.youPlayed}{" "}
              <strong className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-red-600 dark:text-red-400">
                {section.playedSan}
              </strong>
              {section.answerSan?.[0] && (
                <>
                  {" "}→{" "}
                  <strong className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-emerald-600 dark:text-emerald-400">
                    {section.answerSan[0]}
                  </strong>
                </>
              )}
            </p>
          )}

          {section.explain && (
            <div className="rounded-xl border-l-4 border-violet-500 bg-card p-4">
              <p className="text-sm text-foreground/90 leading-relaxed">
                <strong className="text-violet-600 dark:text-violet-400">{t.lessons.whyItWorks}: </strong>
                {section.explain}
              </p>
            </div>
          )}

          {line.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={playLine}
                disabled={playing}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg border border-violet-500/50 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-300 hover:bg-violet-500/10 disabled:opacity-60 transition",
                  playing ? "animate-pulse" : "",
                ].join(" ")}
              >
                <Play className="size-3.5" />
                {playing ? t.lessons.playingLine : t.lessons.playLine}
              </button>
              <span className="text-xs text-muted-foreground">
                {t.lessons.lineLabel}: <strong className="text-foreground/80">{line.join(", ")}</strong>
              </span>
            </div>
          )}

          {/* Engine exploration: stepper through best play for both sides. */}
          {steps === null ? (
            <button
              onClick={exploreLine}
              disabled={computing !== null}
              className={[
                "self-start inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60 transition",
                computing !== null ? "animate-pulse" : "",
              ].join(" ")}
            >
              <Telescope className="size-3.5" />
              {computing !== null ? t.lessons.computingLine(computing, EXPLORE_PLIES) : t.lessons.exploreLine}
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goTo(stepIdx - 1)}
                  disabled={stepIdx === 0}
                  aria-label={t.lessons.stepBack}
                  className="flex w-8 h-8 items-center justify-center rounded-lg border border-input text-foreground/80 hover:border-ring/60 disabled:opacity-30 transition"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => goTo(stepIdx + 1)}
                  disabled={stepIdx === steps.length - 1}
                  aria-label={t.lessons.stepForward}
                  className="flex w-8 h-8 items-center justify-center rounded-lg border border-input text-foreground/80 hover:border-ring/60 disabled:opacity-30 transition"
                >
                  <ChevronRight className="size-4" />
                </button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {stepIdx}/{steps.length - 1}
                </span>
                <div className="flex flex-wrap gap-1 ml-1">
                  {steps.slice(1).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i + 1)}
                      className={[
                        "rounded px-1.5 py-0.5 text-[11px] font-mono transition",
                        i + 1 === stepIdx
                          ? "bg-emerald-600 text-white"
                          : i % 2 === 0
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                          : "bg-accent text-foreground/80 hover:bg-accent/70",
                      ].join(" ")}
                    >
                      {s.san}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/80">{t.lessons.engineLineNote}</p>
            </div>
          )}
        </div>
      )}
      {state === "wrong" && (
        <p className="text-sm text-red-500">
          ✗ {t.lessons.wrong}
          <button onClick={() => setState("idle")} className="ml-2 underline text-muted-foreground">
            {t.puzzles.retry}
          </button>
        </p>
      )}
      {section.sourceUrl && (
        <a href={section.sourceUrl} target="_blank" className="text-xs text-muted-foreground underline">
          {t.puzzles.fromGame}
        </a>
      )}
    </section>
  );
}

function QuizSection({ section }: { section: LessonSectionQuiz }) {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xl font-medium text-foreground">{section.heading ?? t.lessons.lockIn}</h2>
      {section.questions.map((q, i) => (
        <QuizQuestion key={i} q={q.q} choices={q.choices} answerIdx={q.answerIdx} explain={q.explain} />
      ))}
    </section>
  );
}

function QuizQuestion({
  q,
  choices,
  answerIdx,
  explain,
}: {
  q: string;
  choices: string[];
  answerIdx: number;
  explain: string;
}) {
  const sounds = useLessonSounds();
  const [picked, setPicked] = useState<number | null>(null);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === answerIdx) sounds.correct();
    else sounds.wrong();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <p className="text-foreground font-medium">{q}</p>
      <div className="flex flex-col gap-2">
        {choices.map((choice, i) => {
          const isPicked = picked === i;
          const showResult = picked !== null;
          const right = i === answerIdx;
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              className={[
                "text-left rounded-lg border px-4 py-2.5 text-sm transition",
                showResult && right ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200" : "",
                showResult && isPicked && !right ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-200" : "",
                !showResult ? "border-input text-foreground/90 hover:border-ring/60" : "",
                showResult && !isPicked && !right ? "border-border text-muted-foreground" : "",
              ].join(" ")}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {picked !== null && <p className="text-sm text-muted-foreground leading-relaxed">{explain}</p>}
    </div>
  );
}
