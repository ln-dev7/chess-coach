"use client";

import { createContext, useContext, useEffect, useState } from "react";
import en, { type Dict } from "./en";
import fr from "./fr";

export type Locale = "en" | "fr";
const DICTS: Record<Locale, Dict> = { en, fr };
const STORAGE_KEY = "cc:locale";

interface I18n {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
}

const I18nContext = createContext<I18n>({ locale: "en", setLocale: () => {}, t: en });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "en" || stored === "fr") {
      setLocaleState(stored);
    } else if (navigator.language.toLowerCase().startsWith("fr")) {
      setLocaleState("fr");
    }
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }

  return <I18nContext.Provider value={{ locale, setLocale, t: DICTS[locale] }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
