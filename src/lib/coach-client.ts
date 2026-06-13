"use client";

import { useEffect, useState } from "react";
import { buildUserContent, parseModelText, sanitize, SYSTEM_PROMPT } from "./coach";
import type { CoachingDossier } from "./dossier";
import { getProvider } from "./providers";
import { useApiKey, useStoreHydrated } from "./store";
import { loadAiKey } from "./storage";
import type { LessonContent } from "./types";

export interface CoachRequest {
  dossier: CoachingDossier;
  locale: "en" | "fr";
  pastLessonTitles?: string[];
  focus?: string;
}

/**
 * Reactive AI-coach availability: usable if a key is saved in this browser
 * (reflected live from the store) OR a server env key is configured. `ready`
 * is false until both the store has hydrated and the server probe has resolved,
 * so callers can avoid flashing the "no key" state on first paint.
 */
export function useCoachAvailability(): { available: boolean; viaUserKey: boolean; ready: boolean } {
  const apiKey = useApiKey();
  const hydrated = useStoreHydrated();
  const [serverConfigured, setServerConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/coach-lesson")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setServerConfigured(Boolean(d.configured));
      })
      .catch(() => {
        if (alive) setServerConfigured(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const viaUserKey = Boolean(apiKey);
  return {
    available: viaUserKey || serverConfigured === true,
    viaUserKey,
    ready: hydrated && serverConfigured !== null,
  };
}

/**
 * Generate a lesson. If the user saved their own key, the request goes STRAIGHT
 * from this browser to the chosen provider (Anthropic, OpenAI or Google) — the
 * key never touches our server. Otherwise it goes through /api/coach-lesson
 * (owner's env key).
 */
export async function requestAiLesson(args: CoachRequest): Promise<LessonContent & { title: string }> {
  const stored = loadAiKey();

  if (!stored) {
    const res = await fetch("/api/coach-lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Generation failed");
    return data.lesson;
  }

  // BYOK: browser → provider, directly.
  const provider = getProvider(stored.provider);
  const { url, headers, body } = provider.buildRequest({
    key: stored.key,
    system: SYSTEM_PROMPT,
    user: buildUserContent(args),
    browser: true,
  });

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${provider.label} API error (${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = provider.extractText(data);
  const parsed = parseModelText(text);
  if (!parsed) throw new Error("Model did not return valid JSON.");
  const lesson = sanitize(parsed, args.dossier);
  if (!lesson) throw new Error("Model output failed validation.");
  return lesson;
}
