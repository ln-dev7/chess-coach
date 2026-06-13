"use client";

import { buildUserContent, parseModelText, sanitize, SYSTEM_PROMPT } from "./coach";
import type { CoachingDossier } from "./dossier";
import { getProvider } from "./providers";
import { loadAiKey } from "./storage";
import type { LessonContent } from "./types";

export interface CoachRequest {
  dossier: CoachingDossier;
  locale: "en" | "fr";
  pastLessonTitles?: string[];
  focus?: string;
}

/** Is the AI coach usable right now (user key in this browser OR server key)? */
export async function coachAvailability(): Promise<{ available: boolean; viaUserKey: boolean }> {
  if (loadAiKey()) return { available: true, viaUserKey: true };
  try {
    const r = await fetch("/api/coach-lesson");
    const d = await r.json();
    return { available: Boolean(d.configured), viaUserKey: false };
  } catch {
    return { available: false, viaUserKey: false };
  }
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
