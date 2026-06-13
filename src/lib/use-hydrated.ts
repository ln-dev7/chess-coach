"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` during SSR and the very first client render, `true` afterwards.
 *
 * Lets components read browser-only stores (localStorage) during render
 * without a hydration mismatch and without calling setState inside an effect.
 * `useSyncExternalStore` returns the server snapshot (`false`) for the initial
 * render, then re-renders with the client snapshot (`true`) — React owns that
 * transition, so there's no `react-hooks/set-state-in-effect` violation.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
