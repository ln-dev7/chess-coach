"use client";

import { use } from "react";
import Link from "next/link";
import LessonView, { AiLessonView } from "@/components/LessonView";
import { useI18n } from "@/lib/i18n";
import { useAiLessons, useLessons, useStoreHydrated } from "@/lib/store";
import type { AiLessonRow, GeneratedLesson } from "@/lib/types";

type Found = { kind: "template"; lesson: GeneratedLesson } | { kind: "ai"; lesson: AiLessonRow } | null;

function findLesson(slug: string, lessons: GeneratedLesson[], aiLessons: AiLessonRow[]): Found {
  if (slug.startsWith("ai-")) {
    const ai = aiLessons.find((l) => l.id === slug);
    return ai ? { kind: "ai", lesson: ai } : null;
  }
  const tpl = lessons.find((l) => l.slug === slug);
  return tpl ? { kind: "template", lesson: tpl } : null;
}

export default function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t } = useI18n();
  const hydrated = useStoreHydrated();
  const lessons = useLessons();
  const aiLessons = useAiLessons();
  const found: Found | undefined = hydrated ? findLesson(slug, lessons, aiLessons) : undefined;

  if (found === undefined) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {found === null ? (
        <div className="text-muted-foreground">
          {t.lessons.empty}{" "}
          <Link href="/lessons" className="text-emerald-600 dark:text-emerald-400 underline">
            ← {t.lessons.title}
          </Link>
        </div>
      ) : found.kind === "ai" ? (
        <AiLessonView lesson={found.lesson} />
      ) : (
        <LessonView lesson={found.lesson} />
      )}
    </main>
  );
}
