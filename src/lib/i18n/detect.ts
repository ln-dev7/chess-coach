import type { Locale } from "./index";

/**
 * First-visit language detection (only runs when the user hasn't picked a
 * language yet). Signals, in priority order:
 *   1. The browser UI languages (navigator.languages) — clearest intent.
 *   2. The user's physical location, approximated by the IANA time zone —
 *      catches e.g. a French speaker browsing with an English UI.
 *   3. Fallback: English.
 *
 * EXTENDING — to make a new language a possible default (e.g. Spanish), add ONE
 * entry to RULES with its BCP-47 subtags and the time zones where it's the
 * clear majority, and add its dictionary in index.tsx. Nothing else changes.
 * Keep `timezones` to zones where the language is dominant; multilingual
 * countries (Belgium, Switzerland, Canada) are best left to the browser-language
 * signal (fr-BE, fr-CH, fr-CA…) to avoid mislabelling the majority.
 */

interface LangRule {
  locale: Locale;
  /** BCP-47 primary language subtags, lowercased (e.g. "fr"). */
  subtags: string[];
  /** IANA time zones where this language is the clear majority. */
  timezones: string[];
}

const DEFAULT_LOCALE: Locale = "en";

const RULES: LangRule[] = [
  {
    locale: "fr",
    subtags: ["fr"],
    timezones: [
      "Europe/Paris",
      "Europe/Monaco",
      // Francophone Africa (French is the majority / administrative language).
      "Africa/Dakar",
      "Africa/Abidjan",
      "Africa/Bamako",
      "Africa/Ouagadougou",
      "Africa/Niamey",
      "Africa/Lome",
      "Africa/Porto-Novo",
      "Africa/Conakry",
      "Africa/Nouakchott",
      "Africa/Douala",
      "Africa/Libreville",
      "Africa/Bangui",
      "Africa/Brazzaville",
      "Africa/Kinshasa",
      "Africa/Lubumbashi",
      "Africa/Ndjamena",
      "Africa/Kigali",
      "Africa/Bujumbura",
      "Africa/Djibouti",
      "Indian/Antananarivo",
      "Indian/Comoro",
    ],
  },
  // Example — adding Spanish later is just one entry:
  // {
  //   locale: "es",
  //   subtags: ["es"],
  //   timezones: [
  //     "Europe/Madrid",
  //     "America/Mexico_City",
  //     "America/Argentina/Buenos_Aires",
  //     "America/Bogota",
  //     "America/Lima",
  //     "America/Santiago",
  //     "America/Caracas",
  //   ],
  // },
];

export function detectLocale(): Locale {
  // 1) Browser UI language preference.
  if (typeof navigator !== "undefined") {
    const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of tags) {
      if (!tag) continue;
      const subtag = tag.toLowerCase().split("-")[0];
      const rule = RULES.find((r) => r.subtags.includes(subtag));
      if (rule) return rule.locale;
    }
  }

  // 2) Physical location, approximated by the IANA time zone.
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      const rule = RULES.find((r) => r.timezones.includes(tz));
      if (rule) return rule.locale;
    }
  } catch {
    /* Intl unavailable — ignore */
  }

  return DEFAULT_LOCALE;
}
