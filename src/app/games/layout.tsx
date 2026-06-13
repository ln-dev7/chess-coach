import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Browse your imported Chess.com and Lichess games with engine-detected blunders, mistakes, accuracy and phase breakdowns.",
  alternates: { canonical: "/games" },
  openGraph: {
    title: "Your analyzed chess games",
    description:
      "Imported Chess.com and Lichess games with Stockfish blunder detection and accuracy.",
    url: "/games",
  },
};

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
