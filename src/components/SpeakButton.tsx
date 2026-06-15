"use client";

import { useEffect, useId, useRef } from "react";
import { Square, Volume2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  isSpeechSupported,
  registerSpeakTarget,
  setSpeechChaining,
  speak,
  stopSpeech,
  useActiveSpeechId,
} from "@/lib/speech";
import { useSettings } from "@/lib/store";

interface SpeakButtonProps {
  text: string;
  className?: string;
  /** Called when the USER starts playback by clicking (not on auto-chain). */
  onUserStart?: () => void;
  /** Called when the USER stops playback by clicking the button. */
  onUserStop?: () => void;
  /** Receives a replay handle (or null on unmount) so a parent can replay this block. */
  registerControl?: (play: (() => void) | null) => void;
}

/**
 * A small speaker button that reads `text` aloud in the current locale via the
 * Web Speech API. Controlled: click to play, click again (or any other button)
 * to stop. Renders nothing when TTS is unsupported, disabled in Settings, or
 * there's no text.
 *
 * Each button registers itself as a chained-playback target so that, when its
 * audio finishes on its own, the next speakable block starts automatically.
 */
export default function SpeakButton({
  text,
  className = "",
  onUserStart,
  onUserStop,
  registerControl,
}: SpeakButtonProps) {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const id = useId();
  const activeId = useActiveSpeechId();
  const speaking = activeId === id;
  const btnRef = useRef<HTMLButtonElement>(null);

  // Keep the latest props so the registered play()/control always read current values.
  const latest = useRef({ text, locale, voiceURI: settings.voiceURI });
  useEffect(() => {
    latest.current = { text, locale, voiceURI: settings.voiceURI };
  });

  // Keep the global chaining flag in sync with the user's setting.
  useEffect(() => {
    setSpeechChaining(settings.voiceAutoplay !== false);
  }, [settings.voiceAutoplay]);

  const enabled = settings.voiceEnabled !== false && isSpeechSupported() && Boolean(text.trim());

  const play = () => speak(id, latest.current.text, latest.current.locale, latest.current.voiceURI);

  useEffect(() => {
    const el = btnRef.current;
    if (!enabled || !el) return;
    return registerSpeakTarget(id, el, () =>
      speak(id, latest.current.text, latest.current.locale, latest.current.voiceURI)
    );
  }, [enabled, id]);

  // Expose a replay handle to an optional parent (e.g. masters follow-mode).
  useEffect(() => {
    if (!enabled || !registerControl) return;
    registerControl(() => speak(id, latest.current.text, latest.current.locale, latest.current.voiceURI));
    return () => registerControl(null);
  }, [enabled, id, registerControl]);

  if (!enabled) return null;

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={() => {
        if (speaking) {
          stopSpeech();
          onUserStop?.();
        } else {
          play();
          onUserStart?.();
        }
      }}
      aria-label={speaking ? t.tts.stop : t.tts.readAloud}
      title={speaking ? t.tts.stop : t.tts.readAloud}
      className={[
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-input transition",
        speaking
          ? "border-emerald-500 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 animate-pulse"
          : "text-muted-foreground hover:text-foreground hover:border-ring/60",
        className,
      ].join(" ")}
    >
      {speaking ? <Square className="size-3.5" /> : <Volume2 className="size-4" />}
    </button>
  );
}
