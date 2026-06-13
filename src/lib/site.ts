// Central site/SEO config. Override the URL per-environment with NEXT_PUBLIC_SITE_URL.
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://chess-coach.lndev.me"
).replace(/\/$/, "");

export const site = {
  name: "Chess Coach",
  title: "Chess Coach — lessons built from your own games",
  tagline: "Lessons built from your own games",
  description:
    "Import your Chess.com and Lichess games, analyze them with Stockfish right in your browser, and get personalized chess lessons and puzzles built from your own mistakes. Free, private, no account.",
  url: siteUrl,
  locale: "en_US",
  twitter: "@ln_dev7",
  github: "https://github.com/ln-dev7/chess-coach",
  keywords: [
    "chess coach",
    "chess training",
    "chess lessons",
    "chess puzzles",
    "Stockfish analysis",
    "Chess.com analyzer",
    "Lichess analyzer",
    "blunder detection",
    "chess improvement",
    "game analysis",
    "personalized chess training",
    "free chess analysis",
  ],
} as const;
