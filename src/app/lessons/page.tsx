"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import AiLessonGenerator from "@/components/AiLessonGenerator";
import ApiKeyField from "@/components/ApiKeyField";
import DeleteLessonButton from "@/components/DeleteLessonButton";
import GenerateLessonsButton from "@/components/GenerateLessonsButton";
import { useI18n } from "@/lib/i18n";
import { lessonConcept, lessonTitle } from "@/lib/lessons";
import { coachAvailability } from "@/lib/coach-client";
import { useHydrated } from "@/lib/use-hydrated";
import { loadAiLessons, loadLessons, removeAiLesson, removeLesson } from "@/lib/storage";

export default function LessonsPage() {
  const { t, locale } = useI18n();
  const hydrated = useHydrated();
  // Bumped after delete/generate actions to re-read localStorage during render.
  const [, refresh] = useReducer((x) => x + 1, 0);
  const [keyVersion, setKeyVersion] = useState(0);
  // true while loading to avoid a flash; checks BOTH the server env key and the browser key.
  const [aiAvailable, setAiAvailable] = useState(true);

  useEffect(() => {
    coachAvailability().then((a) => setAiAvailable(a.available));
  }, [keyVersion]);

  const lessons = hydrated ? loadLessons() : null;
  const aiLessons = hydrated ? loadAiLessons() : [];

  if (!lessons) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 flex flex-col gap-12">
      <h1 className="text-2xl font-semibold text-foreground">{t.lessons.title}</h1>

      {/* ---- Personalized (AI) lessons — front and center ---- */}
      <section className="flex flex-col gap-5 rounded-2xl border border-violet-800/40 bg-gradient-to-br from-violet-500/10 to-transparent p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium text-violet-700 dark:text-violet-200">✦ {t.lessons.personalized}</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">{t.lessons.personalizedSub}</p>
        </div>

        <AiLessonGenerator key={keyVersion} />

        {/* BYOK field — shown directly, and ONLY when no key exists anywhere
            (neither the server env key nor a key saved in this browser). */}
        {!aiAvailable && <ApiKeyField onChanged={() => setKeyVersion((v) => v + 1)} />}

        {aiLessons.length > 0 && (
          <ul className="grid sm:grid-cols-2 gap-4">
            {aiLessons.map((l) => (
              <li key={l.id} className="relative">
                <DeleteLessonButton
                  onConfirm={() => {
                    removeAiLesson(l.id);
                    refresh();
                  }}
                />
                <Link
                  href={`/lessons/${l.id}`}
                  className="block rounded-xl border border-violet-500/40 bg-violet-500/5 p-5 pr-10 hover:border-violet-500 transition h-full"
                >
                  <p className="text-xs text-violet-600 dark:text-violet-400 mb-1">
                    {new Date(l.created_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}
                    {l.completed && <span className="text-emerald-600 dark:text-emerald-400 ml-2">✓ {t.lessons.completed}</span>}
                  </p>
                  <h3 className="font-medium text-foreground">{l.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{l.content.concept}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Classic template lessons ---- */}
      <section className="flex flex-col gap-5">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium text-foreground">{t.lessons.classic}</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">{t.lessons.classicSub}</p>
          </div>
          <GenerateLessonsButton onGenerated={refresh} />
        </div>

        {lessons.length === 0 ? (
          <p className="text-muted-foreground">{t.lessons.empty}</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {lessons.map((l, i) => (
              <li key={l.slug} className="relative">
                <DeleteLessonButton
                  onConfirm={() => {
                    removeLesson(l.slug);
                    refresh();
                  }}
                />
                <Link
                  href={`/lessons/${l.slug}`}
                  className="block rounded-xl border border-border bg-card p-5 pr-10 hover:border-ring/60 transition h-full"
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    {t.lessons.lesson} {String(i + 1).padStart(2, "0")}
                    {l.completed && <span className="text-emerald-600 dark:text-emerald-400 ml-2">✓ {t.lessons.completed}</span>}
                  </p>
                  <h3 className="font-medium text-foreground">{lessonTitle(l.slug, locale)}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{lessonConcept(l.slug, locale)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
