import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Github, Twitter } from "lucide-react";
import { ThemeProvider } from "next-themes";
import Nav from "@/components/Nav";
import OnboardingModal from "@/components/OnboardingModal";
import StoreHydrator from "@/components/StoreHydrator";
import { I18nProvider } from "@/lib/i18n";
import { site, siteUrl } from "@/lib/site";
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
  metadataBase: new URL(siteUrl),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [...site.keywords],
  authors: [{ name: "ln-dev7", url: site.github }],
  creator: "ln-dev7",
  publisher: "ln-dev7",
  category: "education",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.title,
    description: site.description,
    url: siteUrl,
    locale: site.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
    creator: site.twitter,
    site: site.twitter,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          // Structured data for rich results — describes the free web app.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: site.name,
              url: siteUrl,
              description: site.description,
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              browserRequirements: "Requires JavaScript and WebAssembly.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              author: { "@type": "Person", name: "ln-dev7", url: site.github },
              inLanguage: ["en", "fr"],
            }),
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <I18nProvider>
            <StoreHydrator />
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
