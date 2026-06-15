"use client";

import {
  buildMasterPlies,
  buildMastersUserContent,
  MASTERS_MAX_TOKENS,
  MASTERS_SYSTEM_PROMPT,
  parseMastersText,
  sanitizeMasterAnnotation,
} from "./masters";
import { AppError, aiErrorFromStatus } from "./errors";
import { getProvider } from "./providers";
import { loadAiKey } from "./storage";
import type { MasterAnnotation, MasterGame } from "./types";

/**
 * Generate the per-move reasoning for one master game in one locale. Mirrors
 * requestAiLesson: if the user saved their own key, the request goes STRAIGHT
 * from the browser to the chosen provider; otherwise it goes through the server
 * route (owner's env key). Availability is gated in the UI by useCoachAvailability
 * (same keys / probe as the coach).
 */
export async function requestMasterAnnotation(args: {
  game: MasterGame;
  locale: "en" | "fr";
}): Promise<MasterAnnotation> {
  const { game, locale } = args;
  const plies = buildMasterPlies(game);
  if (!plies.length) throw new Error("Could not read this game.");

  const stored = loadAiKey();

  if (!stored) {
    const res = await fetch("/api/master-annotation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game, locale }),
    });
    const data = await res.json();
    if (!res.ok) throw new AppError(data.code ?? "aiGeneric", data.error);
    return data.annotation;
  }

  // BYOK: browser → provider, directly.
  const provider = getProvider(stored.provider);
  const { url, headers, body } = provider.buildRequest({
    key: stored.key,
    system: MASTERS_SYSTEM_PROMPT,
    user: buildMastersUserContent({ game, plies, locale }),
    maxTokens: MASTERS_MAX_TOKENS,
    browser: true,
  });

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const detail = await res.text();
    throw aiErrorFromStatus(res.status, `${provider.label} ${res.status}: ${detail.slice(0, 120)}`);
  }

  const data = await res.json();
  const parsed = parseMastersText(provider.extractText(data));
  if (!parsed) throw new AppError("aiBadResponse");
  const annotation = sanitizeMasterAnnotation(parsed, {
    gameId: game.id,
    locale,
    plyCount: plies.length,
    createdAt: new Date().toISOString(),
  });
  if (!annotation) throw new AppError("aiBadResponse");
  return annotation;
}
