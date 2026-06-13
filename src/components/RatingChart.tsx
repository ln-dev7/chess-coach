"use client";

import { useMemo, useState } from "react";
import {
  Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useI18n } from "@/lib/i18n";

interface Point {
  date: string;
  rating: number;
  platform: string;
  timeClass: string;
}

export default function RatingChart({ series }: { series: Point[] }) {
  const { t, locale } = useI18n();
  const combos = useMemo(() => {
    const set = new Map<string, number>();
    for (const p of series) {
      const key = `${p.platform}:${p.timeClass}`;
      set.set(key, (set.get(key) ?? 0) + 1);
    }
    return [...set.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [series]);

  const [combo, setCombo] = useState<string | null>(null);
  const active = combo ?? combos[0] ?? null;

  const data = useMemo(() => {
    if (!active) return [];
    const [platform, timeClass] = active.split(":");
    return series
      .filter((p) => p.platform === platform && p.timeClass === timeClass)
      .map((p) => ({
        date: new Date(p.date).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
          day: "2-digit",
          month: "short",
        }),
        rating: p.rating,
      }));
  }, [series, active, locale]);

  if (!series.length) return <p className="text-sm text-muted-foreground">{t.dashboard.noRatedGames}</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {combos.slice(0, 6).map((c) => (
          <button
            key={c}
            onClick={() => setCombo(c)}
            className={[
              "rounded-full px-3 py-1 text-xs border transition",
              c === active
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "border-input text-muted-foreground hover:border-ring/60",
            ].join(" ")}
          >
            {c.replace(":", " · ")}
          </button>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} minTickGap={40} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} domain={["dataMin - 30", "dataMax + 30"]} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--foreground)",
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
            />
            <Line type="monotone" dataKey="rating" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
