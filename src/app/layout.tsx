import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Nav from "@/components/Nav";
import OnboardingModal from "@/components/OnboardingModal";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chess Coach",
  description:
    "Fetches your chess.com and lichess games, analyzes them with Stockfish in your browser, and builds personalized lessons and puzzles from your weaknesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <I18nProvider>
            <OnboardingModal />
            <Nav />
            <div className="flex-1">{children}</div>
            <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground/70">
              Chess Coach · Stockfish WASM
            </footer>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
