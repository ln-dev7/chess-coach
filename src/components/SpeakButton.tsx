"use client";

import { useId } from "react";
import { Square, Volume2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { isSpeechSupported, speak, stopSpeech, useActiveSpeechId } from "@/lib/speech";
import { useSettings } from "@/lib/store";

/**
 * A small speaker button that reads `text` aloud in the current locale via the
 * Web Speech API. Controlled: click to play, click again (or any other button)
 * to stop. Renders nothing when TTS is unsupported, disabled in Settings, or
 * there's no text.
 *
 * Pass `id` to share play/stop state with an external controller (e.g. a
 * block-by-block auto-reader). Pass `onPlay` to override what "play" does
 * (e.g. start a chained sequence); `onStop` is notified when the user stops.
 */
export default function SpeakButton({
  text,
  id: idProp,
  onPlay,
  onStop,
  className = "",
}: {
  text: string;
  id?: string;
  onPlay?: () => void;
  onStop?: () => void;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const autoId = useId();
  const id = idProp ?? autoId;
  const activeId = useActiveSpeechId();
  const speaking = activeId === id;

  if (settings.voiceEnabled === false || !isSpeechSupported() || !text.trim()) return null;

  function handleClick() {
    if (speaking) {
      stopSpeech();
      onStop?.();
    } else if (onPlay) {
      onPlay();
    } else {
      speak(id, text, locale, { voiceURI: settings.voiceURI });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
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
