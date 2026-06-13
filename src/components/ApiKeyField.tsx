"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { AI_PROVIDERS, DEFAULT_PROVIDER_ID, getProvider, type AiProviderId } from "@/lib/providers";
import { clearAiKey, loadAiKey, saveAiKey, type StoredAiKey } from "@/lib/storage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * BYOK field (Settings + Lessons page). The user picks an AI provider
 * (Anthropic, OpenAI or Google) and pastes their key. Display rules:
 * - server env key configured and no browser key → render nothing
 * - browser key saved → show "key saved (provider)" + remove button
 * - no key anywhere → show provider picker + input + save + privacy note
 * The key lives in this browser's localStorage only and is sent straight to the
 * chosen provider — never to our server.
 */
export default function ApiKeyField({ onChanged }: { onChanged?: () => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [provider, setProvider] = useState<AiProviderId>(DEFAULT_PROVIDER_ID);
  const [saved, setSaved] = useState<StoredAiKey | null>(() => loadAiKey());
  const [serverCfg, setServerCfg] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/coach-lesson")
      .then((r) => r.json())
      .then((d) => setServerCfg(Boolean(d.configured)))
      .catch(() => setServerCfg(false));
  }, []);

  function save() {
    if (!value.trim()) return;
    saveAiKey(provider, value);
    setSaved({ provider, key: value.trim() });
    setValue("");
    onChanged?.();
  }

  function remove() {
    clearAiKey();
    setSaved(null);
    setValue("");
    onChanged?.();
  }

  if (serverCfg === null) return null;

  // Browser key present → only offer removal.
  if (saved) {
    return (
      <div className="flex flex-col gap-2 max-w-lg">
        <p className="text-sm text-muted-foreground">{t.settings.apiKey}</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            ✓ {t.settings.apiKeySaved} · {getProvider(saved.provider).label}
          </span>
          <button type="button" onClick={remove} className="text-xs text-red-500 underline hover:text-red-400">
            {t.settings.apiKeyRemove}
          </button>
        </div>
        <p className="text-xs text-muted-foreground/80 leading-relaxed">{t.settings.apiKeyNote}</p>
      </div>
    );
  }

  // Server env key covers everything → nothing to show.
  if (serverCfg) return null;

  const active = getProvider(provider);

  // No key anywhere → provider picker + full field.
  return (
    <div className="flex flex-col gap-2 max-w-lg">
      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {t.settings.aiProvider}
        <Select value={provider} onValueChange={(v) => setProvider(v as AiProviderId)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_PROVIDERS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        {t.settings.apiKey}
        <div className="flex gap-2">
          <input
            type="password"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none w-full"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={active.placeholder}
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

      <p className="text-xs text-muted-foreground/80 leading-relaxed">
        {t.settings.apiKeyNote}{" "}
        <a
          href={active.consoleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {t.settings.apiKeyGet}
        </a>
      </p>
    </div>
  );
}
