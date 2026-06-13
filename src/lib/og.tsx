import { ImageResponse } from "next/og";

// Shared 1200×630 social card, used by both opengraph-image and twitter-image.
export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";
export const ogAlt =
  "Chess Coach — personalized chess lessons and puzzles built from your own Chess.com and Lichess games.";

const BG = "#09090b";
const ACCENT = "#34d399";
const MUTED = "#a1a1aa";
const BORDER = "#27272a";

function Pill({ children }: { children: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 22px",
        borderRadius: 999,
        border: `1px solid ${BORDER}`,
        background: "rgba(255,255,255,0.02)",
        color: MUTED,
        fontSize: 26,
      }}
    >
      {children}
    </div>
  );
}

export function renderOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: 72,
          position: "relative",
        }}
      >
        {/* emerald glow */}
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -160,
            width: 620,
            height: 620,
            borderRadius: 999,
            background:
              "radial-gradient(closest-side, rgba(52,211,153,0.22), rgba(52,211,153,0))",
            display: "flex",
          }}
        />

        {/* top: logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 92,
              height: 92,
              borderRadius: 22,
              background: "#111113",
              border: `1px solid ${BORDER}`,
            }}
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill={ACCENT}>
              <path d="M14 3a1 1 0 0 1 .993 .883l.007 .117v2h1.652l.362 -2.164a1 1 0 0 1 1.034 -.836l.116 .013a1 1 0 0 1 .836 1.035l-.013 .116l-.5 3a1 1 0 0 1 -.865 .829l-.122 .007h-1.383l.877 7.89a1 1 0 0 1 -.877 1.103l-.117 .007h-8a1 1 0 0 1 -1 -.993l.006 -.117l.877 -7.89h-1.383a1 1 0 0 1 -.96 -.718l-.026 -.118l-.5 -3a1 1 0 0 1 1.947 -.442l.025 .114l.361 2.164h1.653v-2a1 1 0 0 1 1.993 -.117l.007 .117v2h2v-2a1 1 0 0 1 1 -1z" />
              <path d="M18 18h-12a1 1 0 0 0 -1 1a2 2 0 0 0 2 2h10a2 2 0 0 0 1.987 -1.768l.011 -.174a1 1 0 0 0 -.998 -1.058z" />
            </svg>
          </div>
          <span style={{ fontSize: 40, fontWeight: 700, color: "#fafafa" }}>
            Chess Coach
          </span>
        </div>

        {/* middle: headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              color: "#fafafa",
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 920,
            }}
          >
            Lessons built from your own games.
          </div>
          <div style={{ display: "flex", fontSize: 32, color: MUTED, maxWidth: 880 }}>
            Import your Chess.com & Lichess games, analyze them with Stockfish in
            your browser, and train on the mistakes that actually cost you.
          </div>
        </div>

        {/* bottom: feature pills + accent bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <Pill>Chess.com + Lichess</Pill>
            <Pill>Stockfish in-browser</Pill>
            <Pill>Puzzles from real games</Pill>
            <Pill>Private · no account</Pill>
          </div>
          <div style={{ display: "flex", height: 6, gap: 8 }}>
            <div style={{ flex: 1, background: ACCENT, borderRadius: 999, display: "flex" }} />
            <div style={{ width: 80, background: BORDER, borderRadius: 999, display: "flex" }} />
            <div style={{ width: 40, background: BORDER, borderRadius: 999, display: "flex" }} />
          </div>
        </div>
      </div>
    ),
    { ...ogSize }
  );
}
