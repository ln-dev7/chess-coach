import { NextRequest, NextResponse } from "next/server";
import { buildUserContent, parseModelText, sanitize, SYSTEM_PROMPT } from "@/lib/coach";
import type { CoachingDossier } from "@/lib/dossier";
import { AI_PROVIDERS, type AiProvider, modelEnvVar } from "@/lib/providers";

export const maxDuration = 60;

/**
 * Server-side AI coach using the OWNER's env key. The first configured provider
 * wins, in this order: Anthropic → OpenAI → Google (Gemini). Set ANTHROPIC_API_KEY,
 * OPENAI_API_KEY or GEMINI_API_KEY (optionally <PROVIDER>_MODEL) in .env.local.
 *
 * Users can alternatively bring their own key, which the browser sends DIRECTLY
 * to the chosen provider (see src/lib/coach-client.ts) — those requests never
 * touch this route.
 */

interface Body {
  dossier: CoachingDossier;
  locale: "en" | "fr";
  pastLessonTitles?: string[];
  focus?: string;
}

/** First provider with a key set in the environment, or null. */
function resolveServerProvider(): { provider: AiProvider; key: string; model?: string } | null {
  for (const provider of AI_PROVIDERS) {
    const key = process.env[provider.envVar];
    if (key) {
      return { provider, key, model: process.env[modelEnvVar(provider.id)] || undefined };
    }
  }
  return null;
}

/** Used by the UI to decide whether the server-side coach is available. */
export async function GET() {
  return NextResponse.json({ configured: Boolean(resolveServerProvider()) });
}

export async function POST(req: NextRequest) {
  const resolved = resolveServerProvider();
  if (!resolved) {
    return NextResponse.json(
      {
        error:
          "No AI key configured. Add ANTHROPIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY to .env.local (see .env.example), or set your own key in Settings.",
      },
      { status: 500 }
    );
  }

  const { provider, key, model } = resolved;

  try {
    const payload = (await req.json()) as Body;
    if (!payload?.dossier?.keyPositions?.length) {
      return NextResponse.json({ error: "Empty dossier — analyze some games first." }, { status: 400 });
    }

    const { url, headers, body } = provider.buildRequest({
      key,
      system: SYSTEM_PROMPT,
      user: buildUserContent(payload),
      model,
      browser: false,
    });

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: `${provider.label} API error (${res.status}): ${detail.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text = provider.extractText(data);
    const parsed = parseModelText(text);
    if (!parsed) {
      return NextResponse.json({ error: "Model did not return valid JSON." }, { status: 502 });
    }

    const lesson = sanitize(parsed, payload.dossier);
    if (!lesson) {
      return NextResponse.json({ error: "Model output failed validation." }, { status: 502 });
    }

    return NextResponse.json({ lesson });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
