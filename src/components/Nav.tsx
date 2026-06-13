"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import Logo from "./Logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n, type Locale } from "@/lib/i18n";

const LOCALES: { value: Locale; flag: string; label: string }[] = [
  { value: "fr", flag: "🇫🇷", label: "Français" },
  { value: "en", flag: "🇬🇧", label: "English" },
];

export default function Nav() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();

  const links = [
    { href: "/", label: t.nav.dashboard },
    { href: "/games", label: t.nav.games },
    { href: "/puzzles", label: t.nav.puzzles },
    { href: "/lessons", label: t.nav.lessons },
    { href: "/settings", label: t.nav.settings },
  ];

  return (
    <header className="border-b border-border sticky top-0 z-20 bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground tracking-tight whitespace-nowrap">
          <Logo className="w-5 h-5" />
          {t.app.name}
        </Link>
        <nav className="flex items-center gap-1 text-sm overflow-x-auto">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={[
                  "rounded-md px-3 py-1.5 transition whitespace-nowrap",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
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
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="w-8 h-8" />;

  const dark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="flex w-8 h-8 items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-foreground hover:border-ring/60 transition"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
