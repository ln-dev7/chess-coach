"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { detectLocale } from "./detect";
import en, { type Dict } from "./en";
import fr from "./fr";

export type Locale = "en" | "fr";
const DICTS: Record<Locale, Dict> = { en, fr };
const STORAGE_KEY = "cc:locale";

/** True for any locale we actually ship a dictionary for (extensible via DICTS). */
function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(DICTS, v);
}

interface I18n {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
}

const I18nContext = createContext<I18n>({ locale: "en", setLocale: () => {}, t: en });

// localStorage-backed locale store, read through useSyncExternalStore so the
// persisted choice applies without a setState-in-effect on mount. The snapshot
// is a primitive string, so it stays referentially stable across renders.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getLocaleSnapshot(): Locale {
  // An explicit, persisted choice always wins; otherwise detect intelligently.
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isLocale(stored)) return stored;
  return detectLocale();
}

function setStoredLocale(l: Locale) {
  localStorage.setItem(STORAGE_KEY, l);
  document.documentElement.lang = l;
  listeners.forEach((cb) => cb());
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getLocaleSnapshot, () => "en" as Locale);

  // Keep <html lang> in sync with the active locale (detected or chosen) for
  // a11y/SEO. DOM-sync side effect — no setState involved.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale: setStoredLocale, t: DICTS[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
