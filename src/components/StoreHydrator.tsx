"use client";

import { useEffect } from "react";
import { hydrateStore } from "@/lib/store";

/**
 * Reads persisted state into the Zustand store once, on the client after mount.
 * Kept as a tiny effect-only component so the store stays skipHydration on the
 * server (no SSR mismatch). Renders nothing.
 */
export default function StoreHydrator() {
  useEffect(() => {
    hydrateStore();
  }, []);
  return null;
}
