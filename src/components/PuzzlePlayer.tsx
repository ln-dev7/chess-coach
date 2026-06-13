"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import { useI18n } from "@/lib/i18n";
import { updatePuzzle } from "@/lib/storage";
import type { PuzzleRow } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clean = (s: string) => s.replace(/[+#?!]/g, "");

export default function PuzzlePlayer({ puzzles }: { puzzles: PuzzleRow[] }) {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);

  if (!puzzles.length) return <p className="text-muted-foreground">{t.puzzles.empty}</p>;
  const puzzle = puzzles[idx % puzzles.length];

  return (
    <SinglePuzzle
      key={`${puzzle.id}-${idx}`}
      puzzle={puzzle}
      index={(idx % puzzles.length) + 1}
      total={puzzles.length}
      onNext={() => setIdx(idx + 1)}
    />
  );
}

function SinglePuzzle({
  puzzle,
  index,
  total,
  onNext,
}: {
  puzzle: PuzzleRow;
  index: number;
  total: number;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const [fen, setFen] = useState(puzzle.fen);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<"playing" | "wrong" | "solved" | "revealed">("playing");
  const [boardKey, setBoardKey] = useState(0);
  const cancelRef = useRef(false);

  useEffect(
    () => () => {
      cancelRef.current = true;
    },
    []
  );

  /** Solution and opponent replies, interleaved: [sol0, rep0, sol1, rep1, ...] */
  const sequence = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < puzzle.solution_san.length; i++) {
      out.push(puzzle.solution_san[i]);
      if (puzzle.reply_san[i]) out.push(puzzle.reply_san[i]);
    }
    return out;
  }, [puzzle]);

  function report(solved: boolean) {
    updatePuzzle(puzzle.id, { attempts: puzzle.attempts + 1, ...(solved ? { solved: true } : {}) });
  }

  function tryMove(san: string): boolean {
    if (state !== "playing") return false;
    if (clean(san) !== clean(puzzle.solution_san[step] ?? "")) {
      setState("wrong");
      report(false);
      return false;
    }

    const isFinal = step + 1 >= puzzle.solution_san.length;
    if (isFinal) {
      setState("solved");
      report(true);
      return true;
    }

    // Auto-play the opponent's reply with a slide animation, then hand back.
    const reply = puzzle.reply_san[step];
    const c = new Chess(fen);
    try {
      c.move(san);
    } catch {
      return false;
    }
    if (reply) {
      setTimeout(() => {
        if (cancelRef.current) return;
        try {
          const m = c.move(reply);
          if (m) {
            setFen(c.fen());
            setLastMove({ from: m.from, to: m.to });
          }
        } catch {
          /* corrupt reply — let the user continue from their move */
        }
        setStep((s) => s + 1);
      }, 480);
    } else {
      setStep(step + 1);
    }
    return true;
  }

  async function showSolution() {
    setState("revealed");
    // Remount the board on the initial position, then replay every move.
    setFen(puzzle.fen);
    setLastMove(null);
    setBoardKey((k) => k + 1);
    const c = new Chess(puzzle.fen);
    for (const san of sequence) {
      await sleep(700);
      if (cancelRef.current) return;
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
  }

  function retry() {
    setFen(puzzle.fen);
    setLastMove(null);
    setStep(0);
    setState("playing");
    setBoardKey((k) => k + 1);
  }

  const sideToMove = puzzle.user_side === "w" ? t.puzzles.white : t.puzzles.black;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <Board
        key={boardKey}
        fen={fen}
        lastMove={lastMove}
        orientation={puzzle.user_side}
        interactive={state === "playing"}
        onTryMove={tryMove}
        showOverlayControls
      />

      <div className="flex flex-col gap-4 max-w-sm">
        <div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs text-foreground/90">
              {t.motifs[puzzle.theme]?.split(" (")[0] ?? puzzle.theme}
            </span>
            {puzzle.kind && (
              <span className="inline-block rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 px-3 py-1 text-xs">
                {t.puzzles.kinds[puzzle.kind]}
              </span>
            )}
            {puzzle.difficulty && (
              <span
                className={[
                  "inline-block rounded-full px-3 py-1 text-xs",
                  puzzle.difficulty === "easy"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : puzzle.difficulty === "hard"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                ].join(" ")}
              >
                {t.puzzles.difficulties[puzzle.difficulty]}
              </span>
            )}
          </div>
          <h2 className="text-lg font-medium text-foreground">
            {t.puzzles.findBest} — {t.puzzles.toMove(sideToMove)}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t.puzzles.counter(index, total)}
            {puzzle.source_url && (
              <>
                {" · "}
                <a href={puzzle.source_url} target="_blank" className="underline hover:text-foreground/90">
                  {t.puzzles.fromGame}
                </a>
              </>
            )}
          </p>
        </div>

        {state === "playing" && step > 0 && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {t.puzzles.correct} {t.puzzles.opponentPlays(puzzle.reply_san[step - 1] ?? "…")}{" "}
            {t.puzzles.moveOf(step + 1, puzzle.solution_san.length)}.
          </p>
        )}
        {state === "solved" && (
          <p className="rounded-lg bg-emerald-500/10 border border-emerald-600/40 px-4 py-3 text-emerald-600 dark:text-emerald-300 text-sm">
            ✓ {t.puzzles.solved} — {puzzle.solution_san.join(", ")}
          </p>
        )}
        {state === "wrong" && (
          <p className="rounded-lg bg-red-500/10 border border-red-600/40 px-4 py-3 text-red-600 dark:text-red-300 text-sm">
            ✗ {t.puzzles.wrong}
          </p>
        )}
        {state === "revealed" && (
          <p className="rounded-lg bg-accent px-4 py-3 text-foreground/90 text-sm">
            {t.puzzles.solution}: <strong>{puzzle.solution_san.join(", ")}</strong>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {(state === "wrong" || state === "revealed") && (
            <button onClick={retry} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">
              {t.puzzles.retry}
            </button>
          )}
          {state !== "solved" && state !== "revealed" && (
            <button
              onClick={showSolution}
              className="rounded-lg border border-input px-4 py-2 text-sm text-foreground/90 hover:border-ring/60"
            >
              {t.puzzles.showSolution}
            </button>
          )}
          <button
            onClick={onNext}
            className="rounded-lg border border-input px-4 py-2 text-sm text-foreground/90 hover:border-ring/60"
          >
            {t.puzzles.next}
          </button>
        </div>
      </div>
    </div>
  );
}
