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
    u.rate = 1;
    u.pitch = 1;
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
    currentUtterance = u;
    // Defend against Chrome leaving the engine in a stuck "paused" state after
    // a previous cancel() — without resume(), speak() is queued but never starts.
    try {
      synth.resume();
    } catch {
      /* no-op */
    }
    synth.speak(u);
  };

  const begin = () => whenVoicesReady(start);

  if (synth.speaking || synth.pending) {
    // Chrome bug: cancel() immediately followed by speak() drops the new
    // utterance. Detach the old one, cancel, then start on a later tick.
    currentUtterance = null;
    synth.cancel();
    setTimeout(begin, 110);
  } else {
    begin();
  }
}

// --- engine unlock (autoplay policy) ---
// Safari (and stricter Chrome modes) refuse speechSynthesis.speak() unless it
// was first triggered inside a user gesture. Auto-read fires from a useEffect,
// which is NOT a gesture, so it stays silent. We unlock the engine once on the
// first interaction anywhere: a zero-volume utterance inside the gesture
// "primes" it, after which programmatic auto-reads are allowed for the session
// (client-side navigation keeps the same document, so it stays unlocked).
let unlocked = false;
export function installSpeechUnlock(): () => void {
  if (!isSpeechSupported() || unlocked || typeof document === "undefined") return () => {};
  const synth = window.speechSynthesis;
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  const remove = () => events.forEach((e) => document.removeEventListener(e, unlock));
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try {
      synth.getVoices(); // kick off async voice loading early
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      synth.speak(u);
    } catch {
      /* no-op */
    }
    remove();
  }
  events.forEach((e) => document.addEventListener(e, unlock));
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
