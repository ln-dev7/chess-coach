import { NextRequest, NextResponse } from "next/server";
import {
  buildMasterPlies,
  buildMastersUserContent,
  MASTERS_MAX_TOKENS,
  MASTERS_SYSTEM_PROMPT,
  parseMastersText,
  sanitizeMasterAnnotation,
} from "@/lib/masters";
import { aiCodeFromStatus } from "@/lib/errors";
import { AI_PROVIDERS, type AiProvider, modelEnvVar } from "@/lib/providers";
import type { MasterGame } from "@/lib/types";

export const maxDuration = 60;

/**
 * Server-side per-move reasoning for a master game, using the OWNER's env key.
 * First configured provider wins (Anthropic → OpenAI → Gemini), same as the
 * coach. Users with their own key never hit this route (browser → provider).
 */

interface Body {
  game: MasterGame;
  locale: "en" | "fr";
}

function resolveServerProvider(): { provider: AiProvider; key: string; model?: string } | null {
  for (const provider of AI_PROVIDERS) {
    const key = process.env[provider.envVar];
    if (key) return { provider, key, model: process.env[modelEnvVar(provider.id)] || undefined };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const resolved = resolveServerProvider();
  if (!resolved) {
    return NextResponse.json(
      { code: "aiNoKey", error: "No AI key configured. Add a provider key in Settings or on the server." },
      { status: 500 }
    );
  }

  const { provider, key, model } = resolved;

  try {
    const payload = (await req.json()) as Body;
    const game = payload?.game;
    if (!game?.pgn) return NextResponse.json({ error: "Missing game." }, { status: 400 });

    const plies = buildMasterPlies(game);
    if (!plies.length) return NextResponse.json({ error: "Could not read this game." }, { status: 400 });

    const { url, headers, body } = provider.buildRequest({
      key,
      system: MASTERS_SYSTEM_PROMPT,
      user: buildMastersUserContent({ game, plies, locale: payload.locale }),
      model,
      maxTokens: MASTERS_MAX_TOKENS,
      browser: false,
    });

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { code: aiCodeFromStatus(res.status), error: `${provider.label} API error (${res.status}): ${detail.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const parsed = parseMastersText(provider.extractText(data));
    if (!parsed) return NextResponse.json({ code: "aiBadResponse", error: "Model did not return valid JSON." }, { status: 502 });

    const annotation = sanitizeMasterAnnotation(parsed, {
      gameId: game.id,
      locale: payload.locale,
      plyCount: plies.length,
      createdAt: new Date().toISOString(),
    });
    if (!annotation) return NextResponse.json({ code: "aiBadResponse", error: "Model output failed validation." }, { status: 502 });

    return NextResponse.json({ annotation });
  } catch (e) {
    return NextResponse.json({ code: "unknown", error: (e as Error).message }, { status: 500 });
  }
}
