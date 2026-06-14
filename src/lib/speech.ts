"use client";

import { useSyncExternalStore } from "react";

/**
 * Text-to-speech via the browser's free, built-in Web Speech API
 * (window.speechSynthesis). No dependency, no API key, no network. One
 * utterance plays at a time; components read `useActiveSpeechId()` to show a
 * play/stop state. Voice is chosen per language, preferring higher-quality
 * local/"enhanced" voices, and can be overridden by the user in Settings.
 */

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function bcp47(locale: string): string {
  return locale === "fr" ? "fr-FR" : "en-US";
}

const QUALITY = /(enhanced|premium|natural|neural|siri|google|wavenet|amélior)/i;

export function pickVoice(locale: string, preferredURI?: string): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const base = locale.slice(0, 2).toLowerCase();
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const pool = matching.length ? matching : voices;
  if (preferredURI) {
    const exact = pool.find((v) => v.voiceURI === preferredURI);
    if (exact) return exact;
  }
  const score = (v: SpeechSynthesisVoice) => (v.localService ? 1 : 0) + (QUALITY.test(v.name) ? 3 : 0);
  return [...pool].sort((a, b) => score(b) - score(a))[0] ?? null;
}

// --- active utterance tracking (one at a time) ---
let activeId: string | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export interface SpeakOptions {
  voiceURI?: string;
  /**
   * Fires ONLY when this utterance finishes naturally — never when it is stopped
   * or superseded by another speak(). Used to auto-chain to the next block.
   * Guarded by utterance identity so a browser that fires `onend` on cancel
   * (rather than `onerror`) still won't chain after an interruption.
   */
  onEnd?: () => void;
}

export function speak(id: string, text: string, locale: string, opts: SpeakOptions = {}): void {
  if (!isSpeechSupported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = bcp47(locale);
  const voice = pickVoice(locale, opts.voiceURI);
  if (voice) u.voice = voice;
  u.rate = 1;
  u.pitch = 1;
  u.onend = () => {
    if (u !== currentUtterance) return; // superseded or stopped → don't chain
    currentUtterance = null;
    activeId = null;
    emit();
    opts.onEnd?.();
  };
  u.onerror = () => {
    if (u !== currentUtterance) return;
    currentUtterance = null;
    activeId = null;
    emit();
  };
  currentUtterance = u;
  activeId = id;
  emit();
  synth.cancel();
  synth.speak(u);
}

export function stopSpeech(): void {
  if (!isSpeechSupported()) return;
  currentUtterance = null; // any in-flight onend now sees it's not current → no chaining
  activeId = null;
  window.speechSynthesis.cancel();
  emit();
}

function subscribeActive(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The id currently being spoken, or null. */
export function useActiveSpeechId(): string | null {
  return useSyncExternalStore(
    subscribeActive,
    () => activeId,
    () => null
  );
}

// --- available voices (loaded asynchronously by the browser) ---
let voicesCache: SpeechSynthesisVoice[] = [];
let voicesSig = "";
const EMPTY_VOICES: SpeechSynthesisVoice[] = [];

function voicesSnapshot(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return EMPTY_VOICES;
  const v = window.speechSynthesis.getVoices();
  const sig = v.map((x) => x.voiceURI).join("|");
  if (sig !== voicesSig) {
    voicesSig = sig;
    voicesCache = v;
  }
  return voicesCache; // stable reference unless the list actually changed
}

function subscribeVoices(cb: () => void) {
  if (!isSpeechSupported()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", cb);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", cb);
}

/** All voices for the given locale (or all voices if none match). */
export function useVoices(locale: string): SpeechSynthesisVoice[] {
  const all = useSyncExternalStore(subscribeVoices, voicesSnapshot, () => EMPTY_VOICES);
  const base = locale.slice(0, 2).toLowerCase();
  const matching = all.filter((v) => v.lang.toLowerCase().startsWith(base));
  return matching.length ? matching : all;
}
