"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import LessonView, { AiLessonView } from "@/components/LessonView";
import { useI18n } from "@/lib/i18n";
import { loadAiLessons, loadLessons } from "@/lib/storage";
import type { AiLessonRow, GeneratedLesson } from "@/lib/types";

type Found = { kind: "template"; lesson: GeneratedLesson } | { kind: "ai"; lesson: AiLessonRow } | null;

export default function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t } = useI18n();
  const [found, setFound] = useState<Found | undefined>(undefined);

  useEffect(() => {
    if (slug.startsWith("ai-")) {
      const ai = loadAiLessons().find((l) => l.id === slug);
      setFound(ai ? { kind: "ai", lesson: ai } : null);
    } else {
      const tpl = loadLessons().find((l) => l.slug === slug);
      setFound(tpl ? { kind: "template", lesson: tpl } : null);
    }
  }, [slug]);

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
