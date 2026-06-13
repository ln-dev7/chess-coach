import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lessons",
  description:
    "Personalized chess lessons generated from your weakness profile — each teaches one mental model with interactive boards, drills from your own games, and retrieval-practice quizzes.",
  alternates: { canonical: "/lessons" },
  openGraph: {
    title: "Chess lessons built from your games",
    description:
      "Personalized chess lessons generated from your own games and recurring mistakes.",
    url: "/lessons",
  },
};

export default function LessonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
