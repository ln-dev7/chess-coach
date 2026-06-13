import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Github, Twitter } from "lucide-react";
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
            <footer className="border-t border-border py-6">
              <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/70">
                <span>Chess Coach · Stockfish WASM · MIT</span>
                <div className="flex items-center gap-5">
                  <a
                    href="https://github.com/ln-dev7/chess-coach"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition"
                  >
                    <Github className="size-3.5" />
                    GitHub
                  </a>
                  <a
                    href="https://x.com/ln_dev7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition"
                  >
                    <Twitter className="size-3.5" />
                    @ln_dev7
                  </a>
                </div>
              </div>
            </footer>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
