/**
 * AI provider abstraction shared by the browser (BYOK — key sent straight from
 * the browser to the provider) and the server route (owner's env key).
 *
 * Only providers that allow direct browser (CORS) calls are listed here, so the
 * BYOK privacy guarantee holds for every one of them: the user's key never
 * touches this app's server. Each provider knows how to build its own request
 * and pull the assistant text out of the response — everything downstream
 * (JSON parsing, validation) stays provider-agnostic in coach.ts.
 */

export type AiProviderId = "anthropic" | "openai" | "gemini";

export interface BuiltRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

interface BuildOpts {
  key: string;
  system: string;
  user: string;
  /** Defaults to the provider's recommended model. */
  model?: string;
  /** true when the call originates from the browser (BYOK). */
  browser: boolean;
}

export interface AiProvider {
  id: AiProviderId;
  /** Shown in the provider picker. */
  label: string;
  /** Example key, used as the input placeholder. */
  placeholder: string;
  /** Recommended model when the user/owner doesn't override it. */
  defaultModel: string;
  /** Where to create an API key. */
  consoleUrl: string;
  /** Server-side env var that holds the owner's key for this provider. */
  envVar: string;
  buildRequest(opts: BuildOpts): BuiltRequest;
  /** Pull the assistant's text out of the parsed JSON response. */
  extractText(json: unknown): string;
}

const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const OPENAI_MODEL = "gpt-4o";
const GEMINI_MODEL = "gemini-2.0-flash";

const anthropic: AiProvider = {
  id: "anthropic",
  label: "Anthropic (Claude)",
  placeholder: "sk-ant-…",
  defaultModel: ANTHROPIC_MODEL,
  consoleUrl: "https://console.anthropic.com/settings/keys",
  envVar: "ANTHROPIC_API_KEY",
  buildRequest({ key, system, user, model, browser }) {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    };
    if (browser) headers["anthropic-dangerous-direct-browser-access"] = "true";
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers,
      body: {
        model: model || ANTHROPIC_MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: user }],
      },
    };
  },
  extractText(json) {
    const content = (json as { content?: { type: string; text?: string }[] }).content;
    return content?.find((b) => b.type === "text")?.text ?? "";
  },
};

const openai: AiProvider = {
  id: "openai",
  label: "OpenAI (GPT)",
  placeholder: "sk-…",
  defaultModel: OPENAI_MODEL,
  consoleUrl: "https://platform.openai.com/api-keys",
  envVar: "OPENAI_API_KEY",
  buildRequest({ key, system, user, model }) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: {
        model: model || OPENAI_MODEL,
        max_tokens: 4096,
        // Our prompt already asks for raw JSON; this hard-guarantees it.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
    };
  },
  extractText(json) {
    const choices = (json as { choices?: { message?: { content?: string } }[] }).choices;
    return choices?.[0]?.message?.content ?? "";
  },
};

const gemini: AiProvider = {
  id: "gemini",
  label: "Google (Gemini)",
  placeholder: "AIza…",
  defaultModel: GEMINI_MODEL,
  consoleUrl: "https://aistudio.google.com/apikey",
  envVar: "GEMINI_API_KEY",
  buildRequest({ key, system, user, model }) {
    const m = model || GEMINI_MODEL;
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
      },
      body: {
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 4096 },
      },
    };
  },
  extractText(json) {
    const parts = (
      json as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    ).candidates?.[0]?.content?.parts;
    return Array.isArray(parts) ? parts.map((p) => p.text ?? "").join("") : "";
  },
};

export const AI_PROVIDERS: AiProvider[] = [anthropic, openai, gemini];

export const DEFAULT_PROVIDER_ID: AiProviderId = "anthropic";

export function isProviderId(v: unknown): v is AiProviderId {
  return AI_PROVIDERS.some((p) => p.id === v);
}

/** Resolve a provider by id, falling back to the default (Anthropic). */
export function getProvider(id: AiProviderId | string | undefined | null): AiProvider {
  return AI_PROVIDERS.find((p) => p.id === id) ?? anthropic;
}

/** Per-provider model override env var, e.g. "OPENAI_MODEL". */
export function modelEnvVar(id: AiProviderId): string {
  return `${id.toUpperCase()}_MODEL`;
}
