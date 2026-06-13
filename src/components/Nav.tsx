"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, X } from "lucide-react";
import Logo from "./Logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n, type Locale } from "@/lib/i18n";
import { useHydrated } from "@/lib/use-hydrated";

const LOCALES: { value: Locale; flag: string; label: string }[] = [
  { value: "fr", flag: "🇫🇷", label: "Français" },
  { value: "en", flag: "🇬🇧", label: "English" },
];

export default function Nav() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the burger menu on navigation — adjust state during render rather
  // than in an effect (React's "store info from previous render" pattern).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const links = [
    { href: "/", label: t.nav.dashboard },
    { href: "/games", label: t.nav.games },
    { href: "/masters", label: t.nav.masters },
    { href: "/lessons", label: t.nav.lessons },
    { href: "/settings", label: t.nav.settings },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="border-b border-border sticky top-0 z-20 bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground tracking-tight whitespace-nowrap">
          <Logo className="w-5 h-5" />
          {t.app.name}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={[
                "rounded-md px-3 py-1.5 transition whitespace-nowrap",
                isActive(l.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger className="h-8 w-[72px] md:w-[120px] text-xs" aria-label="Language">
              <SelectValue>
                <span className="md:hidden">{LOCALES.find((l) => l.value === locale)?.flag}</span>
                <span className="hidden md:inline">
                  {LOCALES.find((l) => l.value === locale)?.flag} {LOCALES.find((l) => l.value === locale)?.label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  <span className="mr-1">{l.flag}</span> {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ThemeToggle />

          {/* Burger (mobile only) */}
          <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            aria-expanded={open}
            className="md:hidden flex w-8 h-8 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-foreground hover:border-ring/60 transition"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav className="md:hidden border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex flex-col gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={[
                "rounded-lg px-3 py-2.5 transition",
                isActive(l.href) ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              ].join(" ")}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();
  if (!mounted) return <span className="w-8 h-8" />;

  const dark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="flex w-8 h-8 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-foreground hover:border-ring/60 transition"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
