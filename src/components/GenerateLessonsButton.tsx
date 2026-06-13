"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { generateLessons } from "@/lib/lessons";
import { buildWeaknessProfile } from "@/lib/stats";
import { loadAnalyses, loadGames, loadLessons, loadPuzzles, saveLessons } from "@/lib/storage";

export default function GenerateLessonsButton({ onGenerated }: { onGenerated?: () => void }) {
  const { t } = useI18n();
  const [msg, setMsg] = useState("");

  function generate() {
    setMsg("");
    const analyses = Object.values(loadAnalyses());
    if (!analyses.length) {
      setMsg(t.lessons.needAnalysis);
      return;
    }
    const profile = buildWeaknessProfile(loadGames(), analyses);
    const fresh = generateLessons(profile, loadPuzzles());
    if (!fresh.length) {
      setMsg(t.lessons.needAnalysis);
      return;
    }
    // Keep completion state of lessons that already existed.
    const existing = new Map(loadLessons().map((l) => [l.slug, l]));
    for (const l of fresh) {
      const prev = existing.get(l.slug);
      if (prev?.completed) l.completed = true;
    }
    saveLessons(fresh);
    onGenerated?.();
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={generate}
        className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition"
      >
        {t.lessons.generate}
      </button>
      {msg && <span className="text-sm text-amber-600 dark:text-amber-400">{msg}</span>}
    </div>
  );
}
