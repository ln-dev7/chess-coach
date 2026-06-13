# ♞ Chess Coach

Personal chess training app: it fetches your games from **Chess.com** and **Lichess**, analyzes them with **Stockfish** (WASM, in your browser), detects your recurring weaknesses, and generates **personalized lessons and puzzles built from your own games** — inspired by the "lines of force" teaching approach.

**No database, no account, no server** for the MVP: everything runs and stays in your browser (localStorage). UI in **French and English** — lessons follow the site language.

Built with Next.js (App Router) + Tailwind v4 + chess.js + Stockfish WASM.

## How it works

```
chess.com / lichess public APIs ──► browser fetch ──► localStorage (games)
                                                          │
                  Stockfish WASM (Web Worker) ◄── pending games
                            │
                            ▼
        evals → blunders / motifs / puzzles ──► localStorage
                            │
                weakness profile ──► localized lesson templates (FR/EN)
```

## Run it

```bash
npm install   # postinstall copies the Stockfish engine into public/stockfish/
npm run dev
```

Open http://localhost:3000 → **Sync** → **Analyze pending games** (keep the tab open; ~5–10s per game) → **Generate lessons**. Language switch (FR/EN) is in the nav and in Settings.

No environment variables needed. Deploy anywhere that serves a Next.js app (Vercel, etc.).

## Features

- **Dashboard** — win rate, accuracy, blunders/game, rating progression chart, top weaknesses
- **Engine analysis** — blunder/mistake detection with motif classification (hanging pieces, missed tactics, allowed forks, mating-net issues, bad trades) and phase breakdown
- **Puzzles** — every blunder becomes a "find the best move" puzzle from your real games
- **Lessons (FR/EN)** — generated from your weakness profile; each teaches one mental model with interactive boards (attack overlays — *see the lines of force*), drills from your games, and retrieval-practice quizzes. Lesson text is rendered in the current site language.
- **AI coach lessons (optional)** — the "✦ AI coach lesson" button compiles a full coaching dossier (weaknesses, key positions with engine-verified facts, clock habits via `%clk`, winning-position conversion) and asks an AI model to write a bespoke lesson in your language, with filters (theme, date range, opponent Elo, platform). Works with **Anthropic (Claude), OpenAI (GPT) or Google (Gemini)**. Two ways to enable it:
  - **Bring your own key**: pick a provider and paste your API key in Settings. It is stored in your browser only and sent **directly from your browser to that provider** (these three all allow direct browser calls) — it never reaches this app's server and is never stored anywhere else. Removable anytime in Settings.
  - **Server key**: set `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `GEMINI_API_KEY` in `.env.local` (self-hosting). When several are set, priority is Anthropic > OpenAI > Google.

  **Fallback**: without any key, a notice appears and template lessons keep working.
- **Board themes & pieces** — Colorful piece set and 12 board themes (ported from the chess-game project), selectable in Settings.
- **Settings** — language, board theme, usernames, number of games to analyze, engine time per position, clear local data

## Project docs

- **`docs/POST-MVP-GUIDE.md`** — read this first before extending the app (vision, phases: IndexedDB → DB + auth → Stripe → AI lessons, conventions, known pitfalls). Written to orient future AI coding sessions.
- **`docs/teaching-principles.md`** — the pedagogy rules the lesson generator follows.

## License

MIT — see [LICENSE](./LICENSE). Stockfish (GPL-3.0) is not distributed in this repo; it is fetched from npm at install time and runs locally in your browser.

## Notes

- Data lives in this browser only (per device). Clearing site data clears your analysis.
- Chess.com accuracy values are kept when available; otherwise a lichess-style accuracy is computed from engine evals.
