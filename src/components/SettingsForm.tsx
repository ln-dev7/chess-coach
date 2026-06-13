"use client";

import { useEffect, useState } from "react";
import { BOARD_THEMES } from "@/lib/board-themes";
import { useI18n, type Locale } from "@/lib/i18n";
import {
  clearAllData,
  clearApiKey,
  DEFAULT_SETTINGS,
  loadApiKey,
  loadSettings,
  saveApiKey,
  saveSettings,
} from "@/lib/storage";

export default function SettingsForm() {
  const { t, locale, setLocale } = useI18n();
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "cleared" | "keyRemoved">("idle");

  useEffect(() => {
    setForm(loadSettings());
    setHasKey(Boolean(loadApiKey()));
  }, []);

  function save(e: React.FormEvent) {
    e.preventDefault();
    saveSettings({
      ...form,
      analyzeLastN: Math.max(10, Math.min(500, Number(form.analyzeLastN) || 50)),
      engineMovetimeMs: Math.max(40, Math.min(2000, Number(form.engineMovetimeMs) || 90)),
    });
    if (apiKey.trim()) {
      saveApiKey(apiKey);
      setApiKey("");
      setHasKey(true);
    }
    setState("saved");
  }

  function removeKey() {
    clearApiKey();
    setHasKey(false);
    setApiKey("");
    setState("keyRemoved");
  }

  function clearData() {
    clearAllData();
    setForm(loadSettings());
    setState("cleared");
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
        <div className="grid grid-cols-4 gap-2">
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

      <div className="flex flex-col gap-2 border-t border-border pt-5">
        <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          {t.settings.apiKey}
          <input
            type="password"
            className={input}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? "••••••••••••" : t.settings.apiKeyPlaceholder}
            autoComplete="off"
          />
        </label>
        <p className="text-xs text-muted-foreground/80 leading-relaxed">{t.settings.apiKeyNote}</p>
        {hasKey && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ {t.settings.apiKeySaved}</span>
            <button
              type="button"
              onClick={removeKey}
              className="text-xs text-red-500 underline hover:text-red-400"
            >
              {t.settings.apiKeyRemove}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium transition"
        >
          {t.settings.save}
        </button>
        {state === "saved" && <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ {t.settings.saved}</span>}
        {state === "cleared" && <span className="text-sm text-amber-600 dark:text-amber-400">{t.settings.cleared}</span>}
        {state === "keyRemoved" && (
          <span className="text-sm text-amber-600 dark:text-amber-400">{t.settings.apiKeyRemoved}</span>
        )}
      </div>

      <div className="border-t border-border pt-5 flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">{t.settings.storageNote}</p>
        <button
          type="button"
          onClick={clearData}
          className="self-start rounded-lg border border-red-900 text-red-500 hover:border-red-600 px-4 py-2 text-sm transition"
        >
          {t.settings.clearData}
        </button>
      </div>
    </form>
  );
}
