"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { getBoardTheme } from "@/lib/board-themes";
import { useI18n } from "@/lib/i18n";
import { loadSettings } from "@/lib/storage";
import type { BoardOverlaySpec } from "@/lib/types";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const PIECE_NAME: Record<string, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

function pieceSrc(color: "w" | "b", type: string): string {
  return `/pieces/colorful/${color === "w" ? "white" : "black"}/${PIECE_NAME[type]}.svg`;
}

interface BoardProps {
  fen: string;
  orientation?: "w" | "b";
  interactive?: boolean;
  /** Called when the user plays a move. Return false to reject (snap back). */
  onTryMove?: (san: string) => boolean | void;
  defaultOverlays?: BoardOverlaySpec;
  showOverlayControls?: boolean;
  lastMove?: { from: string; to: string } | null;
  size?: "sm" | "md" | "lg";
}

interface SquareInfo {
  square: Square;
  piece: { type: string; color: "w" | "b" } | null;
  whiteAttackers: number;
  blackAttackers: number;
  hanging: boolean;
}

export default function Board({
  fen,
  orientation = "w",
  interactive = false,
  onTryMove,
  defaultOverlays,
  showOverlayControls = true,
  lastMove = null,
  size = "md",
}: BoardProps) {
  const { t } = useI18n();
  const [theme] = useState(() => getBoardTheme(loadSettings().boardTheme));
  const [position, setPosition] = useState(fen);
  const [selected, setSelected] = useState<Square | null>(null);
  const [beamSource, setBeamSource] = useState<Square | null>(null);
  const [showWhite, setShowWhite] = useState(Boolean(defaultOverlays?.whiteAttacks));
  const [showBlack, setShowBlack] = useState(Boolean(defaultOverlays?.blackAttacks));
  const [showHanging, setShowHanging] = useState(Boolean(defaultOverlays?.hanging));
  const [last, setLast] = useState(lastMove);
  const [anim, setAnim] = useState<{ to: Square; dx: number; dy: number; seq: number } | null>(null);

  // Delta between two squares in DISPLAYED grid coordinates (percent of one square).
  function dispDelta(from: string, to: string) {
    const colOf = (s: string) => {
      const i = FILES.indexOf(s[0] as (typeof FILES)[number]);
      return orientation === "w" ? i : 7 - i;
    };
    const rowOf = (s: string) => (orientation === "w" ? 8 - Number(s[1]) : Number(s[1]) - 1);
    return { dx: (colOf(from) - colOf(to)) * 100, dy: (rowOf(from) - rowOf(to)) * 100 };
  }

  // Allow parent to reset/advance the position by changing `fen`.
  // When a `lastMove` comes with it, slide the moved piece.
  const [externalFen, setExternalFen] = useState(fen);
  if (fen !== externalFen) {
    setExternalFen(fen);
    setPosition(fen);
    setSelected(null);
    setBeamSource(null);
    setLast(lastMove);
    if (lastMove) {
      const d = dispDelta(lastMove.from, lastMove.to);
      setAnim((a) => ({ to: lastMove.to as Square, dx: d.dx, dy: d.dy, seq: (a?.seq ?? 0) + 1 }));
    } else {
      setAnim(null);
    }
  }

  const chess = useMemo(() => new Chess(position), [position]);

  const info: Map<Square, SquareInfo> = useMemo(() => {
    const map = new Map<Square, SquareInfo>();
    for (let r = 8; r >= 1; r--) {
      for (const f of FILES) {
        const sq = `${f}${r}` as Square;
        const piece = chess.get(sq) ?? null;
        const w = chess.attackers(sq, "w").length;
        const b = chess.attackers(sq, "b").length;
        const hanging = piece
          ? (piece.color === "w" ? b > w : w > b) && piece.type !== "k"
          : false;
        map.set(sq, { square: sq, piece, whiteAttackers: w, blackAttackers: b, hanging });
      }
    }
    return map;
  }, [chess]);

  const beamTargets: Set<Square> = useMemo(() => {
    const set = new Set<Square>();
    if (!beamSource) return set;
    const piece = chess.get(beamSource);
    if (!piece) return set;
    for (const [sq] of info) {
      if (chess.attackers(sq, piece.color).includes(beamSource)) set.add(sq);
    }
    return set;
  }, [beamSource, chess, info]);

  const legalTargets: Set<string> = useMemo(() => {
    if (!selected) return new Set();
    return new Set(chess.moves({ square: selected, verbose: true }).map((m) => m.to));
  }, [selected, chess]);

  function handleClick(sq: Square) {
    const piece = chess.get(sq);

    if (interactive && selected && legalTargets.has(sq)) {
      const probe = new Chess(position);
      const move = probe.move({ from: selected, to: sq, promotion: "q" });
      if (move) {
        const accepted = onTryMove ? onTryMove(move.san) !== false : true;
        if (accepted) {
          setPosition(probe.fen());
          setLast({ from: move.from, to: move.to });
          const d = dispDelta(move.from, move.to);
          setAnim((a) => ({ to: move.to as Square, dx: d.dx, dy: d.dy, seq: (a?.seq ?? 0) + 1 }));
        }
        setSelected(null);
        setBeamSource(null);
        return;
      }
    }

    if (piece) {
      if (interactive && piece.color === chess.turn()) {
        setSelected(selected === sq ? null : sq);
        setBeamSource(selected === sq ? null : sq);
      } else {
        setBeamSource(beamSource === sq ? null : sq);
        setSelected(null);
      }
    } else {
      setSelected(null);
      setBeamSource(null);
    }
  }

  const ranks = orientation === "w" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === "w" ? [...FILES] : [...FILES].reverse();
  const maxW = size === "sm" ? "max-w-[320px]" : size === "lg" ? "max-w-[600px]" : "max-w-[480px]";

  return (
    <div className={`flex flex-col gap-3 w-full ${maxW}`}>
      {/* Square container + cells filling their tracks — same approach as the
          chess-game project's ChessBoard, so squares never detach. */}
      <div className="grid grid-cols-8 grid-rows-8 aspect-square w-full rounded-lg overflow-hidden shadow-lg ring-1 ring-black/30 select-none">
        {ranks.map((r) =>
          files.map((f) => {
            const square = `${f}${r}` as Square;
            const s = info.get(square)!;
            // a1 must be DARK ("light square on the right"): dark ⇔ file+rank odd.
            const dark = (FILES.indexOf(f) + r) % 2 === 1;
            const isSel = selected === square || beamSource === square;
            const inBeam = beamTargets.has(square);
            const isLast = Boolean(last && (last.from === square || last.to === square));
            const showW = showWhite && s.whiteAttackers > 0;
            const showB = showBlack && s.blackAttackers > 0;

            const bg = isSel
              ? dark ? theme.selectedDark : theme.selectedLight
              : isLast
              ? dark ? theme.lastMoveDark : theme.lastMoveLight
              : dark ? theme.darkSquare : theme.lightSquare;

            return (
              <button
                key={square}
                onClick={() => handleClick(square)}
                aria-label={square}
                style={{ backgroundColor: bg }}
                className={[
                  "relative w-full h-full flex items-center justify-center",
                  inBeam ? "shadow-[inset_0_0_0_3px_rgba(56,189,248,0.6)]" : "",
                ].join(" ")}
              >
                {/* file/rank coordinates */}
                {f === files[0] && (
                  <span
                    className="absolute top-0.5 left-1 text-[9px] font-semibold pointer-events-none"
                    style={{ color: dark ? theme.lightSquare : theme.darkSquare }}
                  >
                    {r}
                  </span>
                )}
                {r === ranks[7] && (
                  <span
                    className="absolute bottom-0 right-1 text-[9px] font-semibold pointer-events-none"
                    style={{ color: dark ? theme.lightSquare : theme.darkSquare }}
                  >
                    {f}
                  </span>
                )}

                {showHanging && s.hanging && (
                  <span className="absolute inset-1 rounded-full ring-2 ring-red-500/90 pointer-events-none z-10" />
                )}
                {s.piece && (
                  <PieceImg
                    src={pieceSrc(s.piece.color, s.piece.type)}
                    alt={`${s.piece.color}${s.piece.type}`}
                    slide={anim && anim.to === square ? anim : undefined}
                  />
                )}
                {legalTargets.has(square) && (
                  <span
                    className={[
                      "absolute pointer-events-none",
                      s.piece
                        ? "inset-0.5 rounded-full ring-[3px] ring-zinc-900/30"
                        : "w-1/3 h-1/3 rounded-full bg-zinc-900/25",
                    ].join(" ")}
                  />
                )}
                {(showW || showB) && (
                  <span className="absolute bottom-0.5 right-0.5 flex gap-0.5 pointer-events-none z-10">
                    {showW && (
                      <span className="min-w-3.5 h-3.5 px-0.5 rounded-full bg-emerald-600 text-[9px] font-bold text-white flex items-center justify-center shadow">
                        {s.whiteAttackers}
                      </span>
                    )}
                    {showB && (
                      <span className="min-w-3.5 h-3.5 px-0.5 rounded-full bg-zinc-900 text-[9px] font-bold text-zinc-100 flex items-center justify-center shadow">
                        {s.blackAttackers}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {showOverlayControls && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <OverlayToggle on={showWhite} setOn={setShowWhite} dotClass="bg-emerald-500" label={t.board.whiteAttacks} />
          <OverlayToggle on={showBlack} setOn={setShowBlack} dotClass="bg-zinc-900 ring-1 ring-zinc-400" label={t.board.blackAttacks} />
          <OverlayToggle on={showHanging} setOn={setShowHanging} dotClass="bg-red-500" label={t.board.hanging} />
          <span className="text-xs text-muted-foreground italic w-full">{t.board.clickHint}</span>
        </div>
      )}
    </div>
  );
}

/** Piece image that slides in from its previous square (Web Animations API). */
function PieceImg({
  src,
  alt,
  slide,
}: {
  src: string;
  alt: string;
  slide?: { dx: number; dy: number; seq: number };
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const seq = slide?.seq;
  useEffect(() => {
    if (slide && ref.current?.animate) {
      ref.current.animate(
        [{ transform: `translate(${slide.dx}%, ${slide.dy}%)` }, { transform: "translate(0, 0)" }],
        { duration: 240, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);

  return (
    <span ref={ref} className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className="w-[86%] h-[86%] object-contain drop-shadow-sm" />
    </span>
  );
}

function OverlayToggle({
  on,
  setOn,
  dotClass,
  label,
}: {
  on: boolean;
  setOn: (v: boolean) => void;
  dotClass: string;
  label: string;
}) {
  return (
    <button
      onClick={() => setOn(!on)}
      className={[
        "flex items-center gap-2 rounded-full border px-3 py-1.5 transition",
        on ? "border-ring/60 bg-accent text-accent-foreground" : "border-input text-muted-foreground hover:border-ring/60",
      ].join(" ")}
    >
      <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
      {label}
    </button>
  );
}
