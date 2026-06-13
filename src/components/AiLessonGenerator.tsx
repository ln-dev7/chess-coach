"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, Settings2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { coachAvailability, requestAiLesson } from "@/lib/coach-client";
import { buildDossier, type DossierOptions } from "@/lib/dossier";
import { useI18n } from "@/lib/i18n";
import { addAiLesson, loadAiLessons, loadAnalyses, loadGames } from "@/lib/storage";
import type { AiLessonRow, MoveIssue } from "@/lib/types";

type Topic = "auto" | "opening" | "middlegame" | "endgame" | "attack" | "defense" | "tactics" | "time";

const TOPIC_FILTERS: Partial<Record<Topic, (i: MoveIssue) => boolean>> = {
  opening: (i) => i.phase === "opening",
  middlegame: (i) => i.phase === "middlegame",
  endgame: (i) => i.phase === "endgame",
  attack: (i) => ["missed_tactic", "missed_mate"].includes(i.motif),
  defense: (i) => ["allowed_mate", "allowed_fork", "hanging_piece", "bad_trade"].includes(i.motif),
  tactics: (i) => ["missed_tactic", "allowed_fork", "missed_mate", "allowed_mate"].includes(i.motif),
};

function fmtDay(d: Date, locale: string): string {
  return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const TOPIC_FOCUS: Partial<Record<Topic, string>> = {
  opening: "deep-dive on the player's OPENING play (first ~10 moves): repertoire problems, early mistakes, development habits",
  middlegame: "deep-dive on MIDDLEGAME play: plans, piece activity, recurring middlegame mistakes",
  endgame: "deep-dive on ENDGAME technique: conversion, king activity, pawn endings",
  attack: "deep-dive on ATTACKING play: the winning shots and mating chances this player keeps missing",
  defense: "deep-dive on DEFENSE: the forks, mating nets and hanging pieces this player keeps allowing",
  tactics: "deep-dive on TACTICS: pattern recognition, forcing-move discipline (checks, captures, threats)",
  time: "deep-dive on TIME MANAGEMENT: use the timeManagement data (zeitnot blunders, clock at blunder) as the core of the lesson",
};

/** AI lesson generator with optional filters (date range, opponent rating range, theme). */
export default function AiLessonGenerator() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    eloMin: "",
    eloMax: "",
    topic: "auto" as Topic,
    platform: "all" as "all" | "chesscom" | "lichess",
  });
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    coachAvailability().then((a) => setConfigured(a.available));
  }, []);

  if (configured === null) return null;
  if (configured === false) {
    return (
      <p className="rounded-lg border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-200 leading-relaxed">
        {t.lessons.aiUnavailable}
      </p>
    );
  }

  async function generate() {
    setState("busy");
    setMsg("");
    try {
      const analyses = loadAnalyses();
      let games = loadGames().filter((g) => analyses[g.id]);

      // Platform / date / OPPONENT rating filters.
      if (form.platform !== "all") games = games.filter((g) => g.platform === form.platform);
      if (range?.from) {
        const from = new Date(range.from);
        from.setHours(0, 0, 0, 0);
        games = games.filter((g) => new Date(g.played_at) >= from);
      }
      if (range?.to ?? range?.from) {
        const to = new Date((range.to ?? range.from) as Date);
        to.setHours(23, 59, 59, 999);
        games = games.filter((g) => new Date(g.played_at) <= to);
      }
      const lo = Number(form.eloMin), hi = Number(form.eloMax);
      if (form.eloMin) games = games.filter((g) => (g.opponent_rating ?? 0) >= lo);
      if (form.eloMax) games = games.filter((g) => (g.opponent_rating ?? 9999) <= hi);

      const subset = Object.fromEntries(games.map((g) => [g.id, analyses[g.id]]));
      const opts: DossierOptions = {};
      const filter = TOPIC_FILTERS[form.topic];
      if (filter) opts.issueFilter = filter;

      const dossier = buildDossier(games, subset, opts);
      if (!dossier.keyPositions.length) throw new Error(t.lessons.noMatches);

      const focusParts: string[] = [];
      const topicFocus = TOPIC_FOCUS[form.topic];
      if (topicFocus) focusParts.push(topicFocus);
      if (range?.from)
        focusParts.push(
          `games played ${range.from.toISOString().slice(0, 10)} → ${(range.to ?? range.from).toISOString().slice(0, 10)}`
        );
      if (form.eloMin || form.eloMax) focusParts.push(`opponents rated ${form.eloMin || "…"}-${form.eloMax || "…"}`);
      if (form.platform !== "all") focusParts.push(`${form.platform} games only`);

      const lesson = await requestAiLesson({
        dossier,
        locale,
        pastLessonTitles: loadAiLessons().map((l) => l.title),
        focus: focusParts.join("; ") || undefined,
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
      setState("idle");
      router.push(`/lessons/${row.id}`);
    } catch (e) {
      setMsg((e as Error).message);
      setState("error");
    }
  }

  const input =
    "h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none w-full";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={generate}
          disabled={state === "busy"}
          className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white transition"
        >
          {state === "busy" ? t.lessons.aiGenerating : t.lessons.aiGenerate}
        </button>
        <button
          onClick={() => setOpen(!open)}
          aria-label={t.lessons.options}
          title={t.lessons.options}
          className={[
            "rounded-lg border p-2 transition",
            open
              ? "border-violet-500 text-violet-500 dark:text-violet-300 bg-violet-500/10"
              : "border-input text-muted-foreground hover:border-ring/60",
          ].join(" ")}
        >
          <Settings2 className="size-4" />
        </button>
        {msg && <span className="text-sm text-red-500">{msg}</span>}
      </div>

      {open && (
        <div className="rounded-xl border border-border bg-card p-4 grid sm:grid-cols-2 gap-4 max-w-xl">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t.lessons.topic}
            <Select value={form.topic} onValueChange={(v) => setForm({ ...form, topic: v as Topic })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(t.lessons.topics) as Topic[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {t.lessons.topics[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t.lessons.platform}
            <Select
              value={form.platform}
              onValueChange={(v) => setForm({ ...form, platform: v as "all" | "chesscom" | "lichess" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["all", "chesscom", "lichess"] as const).map((k) => (
                  <SelectItem key={k} value={k}>
                    {t.lessons.platforms[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t.lessons.dateRange}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground hover:border-ring/60 transition outline-none"
                >
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  {range?.from ? (
                    <span>
                      {fmtDay(range.from, locale)}
                      {range.to ? ` – ${fmtDay(range.to, locale)}` : ""}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t.lessons.pickRange}</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={range} onSelect={setRange} defaultMonth={range?.from} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t.lessons.eloMin}
              <input type="number" className={input} placeholder="800" value={form.eloMin} onChange={(e) => setForm({ ...form, eloMin: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              {t.lessons.eloMax}
              <input type="number" className={input} placeholder="1400" value={form.eloMax} onChange={(e) => setForm({ ...form, eloMax: e.target.value })} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
