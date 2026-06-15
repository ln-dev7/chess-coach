import type { Dict } from "./i18n/en";

/**
 * App-wide error model. Every recoverable failure (AI calls, game sync, …) is
 * normalized to one of these codes so the UI can show a single clear, translated
 * message via toast — never a raw provider string or a silent failure.
 */
export type ErrorCode =
  | "network"
  | "unknown"
  | "aiNoKey"
  | "aiAuth"
  | "aiRateLimit"
  | "aiServer"
  | "aiBadResponse"
  | "aiGeneric"
  | "needAnalysis"
  | "noMatchesFilters"
  | "syncUserNotFound"
  | "syncRateLimit"
  | "syncEmpty";

export class AppError extends Error {
  code: ErrorCode;
  /** Optional raw detail (e.g. a provider message) appended to generic errors. */
  detail?: string;
  constructor(code: ErrorCode, detail?: string) {
    super(code);
    this.name = "AppError";
    this.code = code;
    this.detail = detail;
  }
}

/** True when fetch failed at the network layer (offline, DNS, CORS, …). */
export function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError;
}

/** Map an HTTP status from an AI provider (or our API route) to a clear code. */
export function aiCodeFromStatus(status: number): ErrorCode {
  if (status === 401 || status === 403) return "aiAuth";
  if (status === 429) return "aiRateLimit";
  if (status >= 500) return "aiServer";
  return "aiGeneric";
}

/** Build an AppError from an AI provider/API HTTP response. */
export function aiErrorFromStatus(status: number, detail?: string): AppError {
  return new AppError(aiCodeFromStatus(status), detail);
}

/** Resolve any thrown value into a single clear, translated message string. */
export function describeError(e: unknown, t: Dict): string {
  if (e instanceof AppError) {
    const base = t.errors[e.code] ?? t.errors.unknown;
    return e.code === "aiGeneric" && e.detail ? `${base} (${e.detail})` : base;
  }
  if (isNetworkError(e)) return t.errors.network;
  const msg = (e as Error)?.message?.trim();
  return msg || t.errors.unknown;
}
