import { AppError } from "../errors";
import { lichessSpeedToTimeClass, resultForUser } from "../pgn";
import type { GameRow, Platform } from "../types";

interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  createdAt: number;
  status: string;
  winner?: "white" | "black";
  players: {
    white: { user?: { name: string }; rating?: number };
    black: { user?: { name: string }; rating?: number };
  };
  opening?: { eco: string; name: string };
  pgn: string;
}

/**
 * Fetch recent games from lichess as ND-JSON (one JSON game per line).
 * Public endpoint, no token needed for public games.
 */
export async function fetchLichessGames(username: string, maxGames = 300): Promise<GameRow[]> {
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(
    username
  )}?max=${maxGames}&pgnInJson=true&opening=true&perfType=ultraBullet,bullet,blitz,rapid,classical,correspondence`;
  const res = await fetch(url, { headers: { Accept: "application/x-ndjson" } });
  if (res.status === 404) throw new AppError("syncUserNotFound");
  if (res.status === 429) throw new AppError("syncRateLimit");
  if (!res.ok) return [];
  const text = await res.text();
  const lower = username.toLowerCase();
  const out: GameRow[] = [];

  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let g: LichessGame;
    try {
      g = JSON.parse(line);
    } catch {
      continue;
    }
    if (g.variant !== "standard" || !g.pgn) continue;
    const whiteName = g.players.white.user?.name?.toLowerCase() ?? "";
    const userIsWhite = whiteName === lower;
    const userColor: "w" | "b" = userIsWhite ? "w" : "b";
    const me = userIsWhite ? g.players.white : g.players.black;
    const opp = userIsWhite ? g.players.black : g.players.white;
    const pgnResult = g.winner === "white" ? "1-0" : g.winner === "black" ? "0-1" : "1/2-1/2";

    out.push({
      id: `lichess:${g.id}`,
      platform: "lichess" as Platform,
      external_id: g.id,
      analysis_status: "pending",
      url: `https://lichess.org/${g.id}`,
      pgn: g.pgn,
      time_class: lichessSpeedToTimeClass(g.speed),
      time_control: null,
      rated: g.rated,
      played_at: new Date(g.createdAt).toISOString(),
      user_color: userColor,
      user_rating: me.rating ?? null,
      opponent_rating: opp.rating ?? null,
      opponent_name: opp.user?.name ?? null,
      result: resultForUser(pgnResult, userColor),
      eco: g.opening?.eco ?? null,
      opening_name: g.opening?.name ?? null,
      accuracy_user: null,
    });
  }
  return out;
}
