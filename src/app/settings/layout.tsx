import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Set your Chess.com and Lichess usernames, language, board theme and engine depth. Your data stays in your browser.",
  alternates: { canonical: "/settings" },
  robots: { index: false, follow: true },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
