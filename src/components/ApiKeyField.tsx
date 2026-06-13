"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { clearApiKey, loadApiKey, saveApiKey } from "@/lib/storage";

/**
 * Reusable BYOK field (Settings + Lessons page). The key lives in this
 * browser's localStorage only and is sent straight to Anthropic — never to
 * our server.
 */
export default function ApiKeyField({ onChanged }: { onChanged?: () => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [flash, setFlash] = useState<"saved" | "removed" | null>(null);

  useEffect(() => {
    setHasKey(Boolean(loadApiKey()));
  }, []);

  function save() {
    if (!value.trim()) return;
    saveApiKey(value);
    setValue("");
    setHasKey(true);
    setFlash("saved");
    onChanged?.();
  }

  function remove() {
    clearApiKey();
    setHasKey(false);
    setValue("");
    setFlash("removed");
    onChanged?.();
  }

  return (
    <div className="flex flex-col gap-2 max-w-md">
      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {t.settings.apiKey}
        <div className="flex gap-2">
          <input
            type="password"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none w-full"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={hasKey ? "••••••••••••" : t.settings.apiKeyPlaceholder}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={save}
            disabled={!value.trim()}
            className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 px-4 text-sm font-medium transition whitespace-nowrap"
          >
            {t.settings.save}
          </button>
        </div>
      </label>
      <p className="text-xs text-muted-foreground/80 leading-relaxed">{t.settings.apiKeyNote}</p>
      <div className="flex items-center gap-3">
        {hasKey && (
          <>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ {t.settings.apiKeySaved}</span>
            <button type="button" onClick={remove} className="text-xs text-red-500 underline hover:text-red-400">
              {t.settings.apiKeyRemove}
            </button>
          </>
        )}
        {!hasKey && flash === "removed" && (
          <span className="text-xs text-amber-600 dark:text-amber-400">{t.settings.apiKeyRemoved}</span>
        )}
      </div>
    </div>
  );
}
