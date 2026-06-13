"use client";

import { useEffect, useState } from "react";
import PuzzlePlayer from "@/components/PuzzlePlayer";
import { useI18n } from "@/lib/i18n";
import { loadPuzzles } from "@/lib/storage";
import type { PuzzleRow } from "@/lib/types";

/**
 * Curate the queue: unsolved first, then round-robin across themes so the
 * player never grinds 15 "hanging piece" puzzles in a row (interleaving —
 * see docs/teaching-principles.md).
 */
function curate(all: PuzzleRow[], max = 100): PuzzleRow[] {
  const ordered = [...all].sort((a, b) => Number(a.solved) - Number(b.solved));
  const byTheme = new Map<string, PuzzleRow[]>();
  for (const p of ordered) {
    const list = byTheme.get(p.theme) ?? [];
    list.push(p);
    byTheme.set(p.theme, list);
  }
  const queues = [...byTheme.values()];
  const out: PuzzleRow[] = [];
  let added = true;
  while (out.length < max && added) {
    added = false;
    for (const q of queues) {
      const next = q.shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

export default function PuzzlesPage() {
  const { t } = useI18n();
  const [puzzles, setPuzzles] = useState<PuzzleRow[] | null>(null);

  useEffect(() => {
    setPuzzles(curate(loadPuzzles()));
  }, []);

  if (!puzzles) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">{t.puzzles.title}</h1>
      <PuzzlePlayer puzzles={puzzles} />
    </main>
  );
}
