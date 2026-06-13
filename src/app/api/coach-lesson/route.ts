import { NextRequest, NextResponse } from "next/server";
import { buildUserContent, DEFAULT_MODEL, parseModelText, sanitize, SYSTEM_PROMPT } from "@/lib/coach";
import type { CoachingDossier } from "@/lib/dossier";

export const maxDuration = 60;

/**
 * Server-side AI coach using the OWNER's ANTHROPIC_API_KEY (env).
 * Users can alternatively bring their own key, which the browser sends
 * DIRECTLY to api.anthropic.com (see src/lib/coach-client.ts) — those
 * requests never touch this route.
 */

interface Body {
  dossier: CoachingDossier;
  locale: "en" | "fr";
  pastLessonTitles?: string[];
  focus?: string;
}

/** Used by the UI to decide whether the server-side coach is available. */
export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY. Add it to .env.local (see .env.example), or set your own key in Settings." },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as Body;
    if (!body?.dossier?.keyPositions?.length) {
      return NextResponse.json({ error: "Empty dossier — analyze some games first." }, { status: 400 });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildUserContent(body),
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: `Claude API error (${res.status}): ${detail.slice(0, 300)}` }, { status: 502 });
    }

    const data = await res.json();
    const text: string = data?.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
    const parsed = parseModelText(text);
    if (!parsed) {
      return NextResponse.json({ error: "Model did not return valid JSON." }, { status: 502 });
    }

    const lesson = sanitize(parsed, body.dossier);
    if (!lesson) {
      return NextResponse.json({ error: "Model output failed validation." }, { status: 502 });
    }

    return NextResponse.json({ lesson });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
