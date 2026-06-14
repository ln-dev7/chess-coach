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
let speakSeq = 0; // bumped on every speak/stop to invalidate deferred starts
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export interface SpeakOptions {
  voiceURI?: string;
  /** Called only when the utterance finishes NATURALLY (not on stop / supersede). */
  onEnd?: () => void;
}

/**
 * Run `cb` once the browser's voice list is populated. The very first speak()
 * after a page load usually races voice loading (getVoices() is empty and
 * fills in asynchronously); speaking before then is silently dropped by Chrome
 * and Safari — the utterance never starts and onend/onerror never fire, so the
 * UI looks "speaking" forever with no sound. We wait for `voiceschanged`, with
 * a timeout fallback for engines that never emit it (some Safari/Firefox).
 */
function whenVoicesReady(cb: () => void): void {
  const synth = window.speechSynthesis;
  if (synth.getVoices().length) {
    cb();
    return;
  }
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    synth.removeEventListener("voiceschanged", fire);
    cb();
  };
  synth.addEventListener("voiceschanged", fire);
  setTimeout(fire, 500); // fallback: speak with the default voice rather than stay silent
}

export function speak(id: string, text: string, locale: string, opts: SpeakOptions = {}): void {
  if (!isSpeechSupported() || !text.trim()) return;
  const synth = window.speechSynthesis;
  const seq = ++speakSeq;
  activeId = id;
  emit();

  const start = () => {
    if (seq !== speakSeq) return; // a newer speak()/stop() superseded this one
    const u = new SpeechSynthesisUtterance(text);
    u.lang = bcp47(locale);
    const voice = pickVoice(locale, opts.voiceURI);
    if (voice) u.voice = voice;
    u.onend = () => {
      if (u !== currentUtterance) return; // superseded or stopped
      currentUtterance = null;
      activeId = null;
      emit();
      opts.onEnd?.(); // natural end → caller may chain to the next block
    };
    u.onerror = () => {
      if (u !== currentUtterance) return;
      currentUtterance = null;
      activeId = null;
      emit();
    };
    // Set as current BEFORE cancel() so a cancelled prior utterance's onend
    // sees it's no longer current and doesn't chain. Then cancel + speak in the
    // same tick — the plain, proven path that works in Chrome.
    currentUtterance = u;
    synth.cancel();
    synth.speak(u);
  };

  whenVoicesReady(start);
}

// --- warm voices on first interaction ---
// Trigger async voice loading early, on the first user gesture, so the voice
// list is populated by the time anything is read aloud. We deliberately do NOT
// speak a priming utterance here: leaving one queued would make the next
// speak()'s cancel()+speak() hit Chrome's "drop the new utterance" bug and play
// nothing. Chrome allows programmatic speak() without a gesture anyway.
let warmed = false;
export function installSpeechUnlock(): () => void {
  if (!isSpeechSupported() || warmed || typeof document === "undefined") return () => {};
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  const remove = () => events.forEach((e) => document.removeEventListener(e, warm));
  function warm() {
    if (warmed) return;
    warmed = true;
    try {
      window.speechSynthesis.getVoices();
    } catch {
      /* no-op */
    }
    remove();
  }
  events.forEach((e) => document.addEventListener(e, warm));
  return remove;
}

export function stopSpeech(): void {
  if (!isSpeechSupported()) return;
  speakSeq++; // invalidate any pending deferred start
  currentUtterance = null; // prevents any pending onEnd from chaining
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
