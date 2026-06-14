// Build the bundled catalog of iconic master games.
//
// Full rebuild (fetches the historic source + merges curated modern games):
//   node scripts/build-masters.mjs
//
// It fetches a clean, well-tagged collection of famous games, splits it into
// individual games, VALIDATES every one through chess.js (the same engine the
// runtime uses via parsePgn — illegal/truncated games are rejected), applies
// the curated overlays from masters-seed.json, then appends the curated modern
// `extraGames` (long classical games not present in the historic source, each
// carrying its own movetext + metadata, validated the same way), and writes
// src/lib/masters/catalog.json sorted by `iconic` (most iconic first). A bad
// game hard-fails the script so it can never reach the app.
//
// If you only changed/added `extraGames` (no need to refetch the historic
// source), run the offline merge instead: node scripts/merge-extra-masters.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Chess } from "chess.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
export const SEED = JSON.parse(readFileSync(join(__dirname, "masters-seed.json"), "utf8"));
export const OUT = join(ROOT, "src/lib/masters/catalog.json");

const MIN_PLIES = 10;

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function lastName(full) {
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1] || full;
}

/** Split a multi-game PGN into individual game strings. */
function splitGames(pgn) {
  const lines = pgn.split(/\r?\n/);
  const games = [];
  let cur = [];
  let sawMoves = false;
  for (const line of lines) {
    const isHeader = /^\s*\[/.test(line);
    if (isHeader && sawMoves) {
      games.push(cur.join("\n").trim());
      cur = [];
      sawMoves = false;
    }
    if (!isHeader && line.trim()) sawMoves = true;
    cur.push(line);
  }
  if (cur.join("").trim()) games.push(cur.join("\n").trim());
  return games.filter((g) => /\[Event/i.test(g));
}

function parseHeaders(game) {
  const headers = {};
  for (const m of game.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) headers[m[1]] = m[2];
  return headers;
}

/** Validate via chess.js exactly like the runtime parsePgn; throws on any problem. */
function validate(game, headers) {
  const chess = new Chess();
  chess.loadPgn(game, { strict: false });
  const verbose = chess.history({ verbose: true });
  if (verbose.length < MIN_PLIES) throw new Error(`only ${verbose.length} plies`);
  // Re-replay into a fresh board to catch any silent truncation/illegal move.
  const replay = new Chess(headers.FEN || undefined);
  for (const mv of verbose) {
    const made = replay.move(mv.san);
    if (!made) throw new Error(`illegal move ${mv.san}`);
  }
  // Result consistency: a "#" finish must be checkmate.
  const lastSan = verbose[verbose.length - 1].san;
  if (lastSan.includes("#") && !replay.isCheckmate()) throw new Error("claims mate but not checkmate");
  return verbose.length;
}

function findOverlay(headers) {
  const w = (headers.White || "").toLowerCase();
  const b = (headers.Black || "").toLowerCase();
  return SEED.overlays.find(
    (o) => w.includes(o.white.toLowerCase()) && b.includes(o.black.toLowerCase())
  );
}

/** Iconic score for an already-built catalog entry, matched against overlays. */
export function overlayIconicFor(entry, seed = SEED) {
  const w = (entry.white || "").toLowerCase();
  const b = (entry.black || "").toLowerCase();
  const o = (seed.overlays || []).find(
    (ov) => w.includes(ov.white.toLowerCase()) && b.includes(ov.black.toLowerCase())
  );
  return o?.iconic ?? 0;
}

function yearOf(headers) {
  const y = Number((headers.Date || headers.EventDate || "").slice(0, 4));
  return Number.isFinite(y) && y > 1400 ? y : null;
}

function winnerSide(result) {
  if (result === "1-0") return "w";
  if (result === "0-1") return "b";
  return "w";
}

/** Most iconic first; ties broken by year then id for a stable, reproducible order. */
export function sortCatalog(catalog) {
  return catalog.sort(
    (a, b) => (b.iconic ?? 0) - (a.iconic ?? 0) || (a.year ?? 0) - (b.year ?? 0) || a.id.localeCompare(b.id)
  );
}

/** Build a full PGN string for a curated inline game from its metadata + movetext. */
function extraPgn(extra) {
  const date = extra.year ? `${extra.year}.??.??` : "????.??.??";
  const headers = [
    `[Event "${extra.event ?? "?"}"]`,
    `[Site "?"]`,
    `[Date "${date}"]`,
    `[Round "?"]`,
    `[White "${extra.white}"]`,
    `[Black "${extra.black}"]`,
    `[Result "${extra.result ?? "*"}"]`,
  ].join("\n");
  return `${headers}\n\n${extra.moves.trim()}\n`;
}

/** Build one catalog entry from a curated inline game (validated like fetched games). */
function buildExtraEntry(extra, seenIds) {
  const pgn = extraPgn(extra);
  validate(pgn, { White: extra.white, Black: extra.black, Result: extra.result });
  const id = extra.id || slugify(`${lastName(extra.white)}-${lastName(extra.black)}-${extra.year ?? "x"}`);
  if (seenIds.has(id)) throw new Error(`duplicate id "${id}" for ${extra.white} vs ${extra.black}`);
  seenIds.add(id);
  return {
    id,
    pgn,
    title: extra.title ?? `${extra.white} vs ${extra.black}`,
    white: extra.white,
    black: extra.black,
    event: extra.event ?? null,
    year: extra.year ?? 0,
    result: extra.result ?? "*",
    studySide: extra.studySide ?? winnerSide(extra.result),
    tags: extra.tags ?? [],
    sourceUrl: extra.sourceUrl ?? null,
    teaser: {
      en: extra.teaser_en ?? `${extra.white} vs ${extra.black}${extra.year ? ` — ${extra.year}` : ""}.`,
      fr: extra.teaser_fr ?? `${extra.white} contre ${extra.black}${extra.year ? ` — ${extra.year}` : ""}.`,
    },
    iconic: extra.iconic ?? 0,
  };
}

/** Build catalog entries for all curated inline games. Throws on any invalid game. */
export function buildExtraEntries(seed = SEED, seenIds = new Set()) {
  return (seed.extraGames || []).map((extra) => buildExtraEntry(extra, seenIds));
}

async function main() {
  console.log(`Fetching ${SEED.source} …`);
  const res = await fetch(SEED.source, { headers: { Accept: "application/x-chess-pgn, text/plain" } });
  if (!res.ok) throw new Error(`source fetch failed: HTTP ${res.status}`);
  const pgn = await res.text();

  const games = splitGames(pgn);
  console.log(`Found ${games.length} games; validating…`);

  const catalog = [];
  const seenIds = new Set();
  const errors = [];

  for (const game of games) {
    const headers = parseHeaders(game);
    const white = headers.White?.trim();
    const black = headers.Black?.trim();
    if (!white || !black) continue;
    try {
      validate(game, headers);
    } catch (e) {
      errors.push(`${white} vs ${black}: ${e.message}`);
      continue;
    }
    const year = yearOf(headers);
    const overlay = findOverlay(headers);
    const result = headers.Result || "*";

    let id = slugify(`${lastName(white)}-${lastName(black)}-${year ?? "x"}`);
    let n = 2;
    while (seenIds.has(id)) id = slugify(`${lastName(white)}-${lastName(black)}-${year ?? "x"}-${n++}`);
    seenIds.add(id);

    const title = overlay?.title ?? `${white} vs ${black}`;
    catalog.push({
      id,
      pgn: game.trim() + "\n",
      title,
      white,
      black,
      event: headers.Event?.trim() || null,
      year: year ?? 0,
      result,
      studySide: overlay?.studySide ?? winnerSide(result),
      tags: overlay?.tags ?? [],
      sourceUrl: headers.Site && /^https?:/.test(headers.Site) ? headers.Site : null,
      teaser: {
        en: overlay?.teaser_en ?? `${white} vs ${black}${year ? ` — ${year}` : ""}.`,
        fr: overlay?.teaser_fr ?? `${white} contre ${black}${year ? ` — ${year}` : ""}.`,
      },
      iconic: overlay?.iconic ?? 0,
    });
  }

  // Append curated modern games (validated the same way).
  const extras = buildExtraEntries(SEED, seenIds);
  catalog.push(...extras);

  if (!catalog.length) throw new Error("no valid games produced");
  sortCatalog(catalog);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`\nWrote ${catalog.length} games → ${OUT}`);
  console.log(`  historic: ${catalog.length - extras.length} · curated modern: ${extras.length}`);
  console.log(`  with an iconic score: ${catalog.filter((g) => g.iconic > 0).length}`);
  if (errors.length) {
    console.log(`\nSkipped ${errors.length} unparseable game(s):`);
    for (const e of errors) console.log(`  - ${e}`);
  }
}

// Only run the full (networked) rebuild when invoked directly.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("BUILD FAILED:", e.message);
    process.exit(1);
  });
}
