"use client";

import { useState } from "react";
import ApiKeyField from "./ApiKeyField";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BOARD_THEMES } from "@/lib/board-themes";
import { useI18n, type Locale } from "@/lib/i18n";
import { useHydrated } from "@/lib/use-hydrated";
import { clearAllData, loadSettings, saveSettings } from "@/lib/storage";

export default function SettingsForm() {
  // Render nothing until hydrated, so the inner form can lazy-init its editable
  // state straight from localStorage without an SSR mismatch.
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return <SettingsFormInner />;
}

function SettingsFormInner() {
  const { t, locale, setLocale } = useI18n();
  const [form, setForm] = useState(() => loadSettings());
  const [state, setState] = useState<"idle" | "saved" | "cleared">("idle");

  function save(e: React.FormEvent) {
    e.preventDefault();
    saveSettings({
      ...form,
      analyzeLastN: Math.max(10, Math.min(500, Number(form.analyzeLastN) || 50)),
      engineMovetimeMs: Math.max(40, Math.min(2000, Number(form.engineMovetimeMs) || 90)),
    });
    setState("saved");
  }

  function clearData() {
    clearAllData();
    // Back to a fresh start: home + onboarding modal.
    window.location.href = "/";
  }

  const input =
    "rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground focus:border-emerald-500 focus:outline-none w-full";

  return (
    <form onSubmit={save} className="flex flex-col gap-6 max-w-md">
      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {t.settings.chesscom}
        <input
          className={input}
          value={form.chesscomUsername}
          onChange={(e) => setForm({ ...form, chesscomUsername: e.target.value.trim() })}
          placeholder="ln_dev"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {t.settings.lichess}
        <input
          className={input}
          value={form.lichessUsername}
          onChange={(e) => setForm({ ...form, lichessUsername: e.target.value.trim() })}
          placeholder="ln_dev7"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {t.settings.language}
        <div className="flex gap-2">
          {(["fr", "en"] as Locale[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              className={[
                "rounded-lg border px-4 py-2 text-sm transition",
                locale === l
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "border-input text-muted-foreground hover:border-ring/60",
              ].join(" ")}
            >
              {l === "fr" ? "Français" : "English"}
            </button>
          ))}
        </div>
      </label>

      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {t.settings.boardTheme}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BOARD_THEMES.map((th) => {
            const active = form.boardTheme === th.id;
            return (
              <button
                key={th.id}
                type="button"
                onClick={() => {
                  setForm({ ...form, boardTheme: th.id });
                  saveSettings({ ...loadSettings(), boardTheme: th.id });
                }}
                className={[
                  "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition",
                  active ? "border-emerald-500 bg-emerald-500/10" : "border-input hover:border-ring/60",
                ].join(" ")}
              >
                <span className="grid grid-cols-2 w-10 h-10 rounded overflow-hidden ring-1 ring-black/30">
                  <span style={{ backgroundColor: th.lightSquare }} />
                  <span style={{ backgroundColor: th.darkSquare }} />
                  <span style={{ backgroundColor: th.darkSquare }} />
                  <span style={{ backgroundColor: th.lightSquare }} />
                </span>
                <span className={`text-[11px] ${active ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground"}`}>{th.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {t.settings.sound}
        <div className="flex gap-2">
          {([true, false] as const).map((on) => {
            const active = (form.soundEnabled ?? true) === on;
            return (
              <button
                key={String(on)}
                type="button"
                onClick={() => {
                  setForm({ ...form, soundEnabled: on });
                  saveSettings({ ...loadSettings(), soundEnabled: on });
                }}
                className={[
                  "rounded-lg border px-4 py-2 text-sm transition",
                  active
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : "border-input text-muted-foreground hover:border-ring/60",
                ].join(" ")}
              >
                {on ? t.settings.soundOn : t.settings.soundOff}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {t.settings.analyzeLastN}
        <input
          type="number"
          className={input}
          value={form.analyzeLastN}
          onChange={(e) => setForm({ ...form, analyzeLastN: Number(e.target.value) })}
          min={10}
          max={500}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {t.settings.movetime}
        <input
          type="number"
          className={input}
          value={form.engineMovetimeMs}
          onChange={(e) => setForm({ ...form, engineMovetimeMs: Number(e.target.value) })}
          min={40}
          max={2000}
          step={10}
        />
      </label>

      <ApiKeyField />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium transition"
        >
          {t.settings.save}
        </button>
        {state === "saved" && <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ {t.settings.saved}</span>}
        {state === "cleared" && <span className="text-sm text-amber-600 dark:text-amber-400">{t.settings.cleared}</span>}
      </div>

      <div className="border-t border-border pt-5 flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">{t.settings.storageNote}</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="self-start rounded-lg border border-red-900 text-red-500 hover:border-red-600 px-4 py-2 text-sm transition"
            >
              {t.settings.clearData}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.settings.clearTitle}</AlertDialogTitle>
              <AlertDialogDescription>{t.settings.clearDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.lessons.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={clearData}>{t.settings.clearData}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </form>
  );
}
