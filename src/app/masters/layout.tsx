import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masters",
  description:
    "Study iconic grandmaster games move by move — the Immortal, the Evergreen, the Game of the Century and more — with an AI explanation of the reasoning behind every move and on-demand engine analysis.",
  alternates: { canonical: "/masters" },
  openGraph: {
    title: "Learn from iconic grandmaster games",
    description:
      "Replay famous games move by move and understand the plan behind every move.",
    url: "/masters",
  },
};

export default function MastersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
