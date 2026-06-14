"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { hydrateStore } from "@/lib/store";
import { stopSpeech } from "@/lib/speech";

/**
 * Reads persisted state into the Zustand store once, on the client after mount.
 * Kept as a tiny effect-only component so the store stays skipHydration on the
 * server (no SSR mismatch). Also stops any read-aloud speech when the route
 * changes (the cleanup runs on leave, before the next page's effects, so it
 * never cancels a freshly-started auto-read). Renders nothing.
 */
export default function StoreHydrator() {
  const pathname = usePathname();

  useEffect(() => {
    hydrateStore();
  }, []);

  useEffect(() => () => stopSpeech(), [pathname]);

  return null;
}
