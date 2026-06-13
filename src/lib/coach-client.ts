"use client";

import { buildUserContent, DEFAULT_MODEL, parseModelText, sanitize, SYSTEM_PROMPT } from "./coach";
import type { CoachingDossier } from "./dossier";
import { loadApiKey } from "./storage";
import type { LessonContent } from "./types";

export interface CoachRequest {
  dossier: CoachingDossier;
  locale: "en" | "fr";
  pastLessonTitles?: string[];
  focus?: string;
}

/** Is the AI coach usable right now (user key in this browser OR server key)? */
export async function coachAvailability(): Promise<{ available: boolean; viaUserKey: boolean }> {
  if (loadApiKey()) return { available: true, viaUserKey: true };
  try {
    const r = await fetch("/api/coach-lesson");
    const d = await r.json();
    return { available: Boolean(d.configured), viaUserKey: false };
  } catch {
    return { available: false, viaUserKey: false };
  }
}

/**
 * Generate a lesson. If the user saved their own Anthropic key, the request
 * goes STRAIGHT from this browser to api.anthropic.com (the key never touches
 * our server). Otherwise it goes through /api/coach-lesson (owner's env key).
 */
export async function requestAiLesson(args: CoachRequest): Promise<LessonContent & { title: string }> {
  const userKey = loadApiKey();

  if (!userKey) {
    const res = await fetch("/api/coach-lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Generation failed");
    return data.lesson;
  }

  // BYOK: browser → Anthropic, directly.
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": userKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserContent(args) }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Claude API error (${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: string = data?.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
  const parsed = parseModelText(text);
  if (!parsed) throw new Error("Model did not return valid JSON.");
  const lesson = sanitize(parsed, args.dossier);
  if (!lesson) throw new Error("Model output failed validation.");
  return lesson;
}
