"use client";

import SettingsForm from "@/components/SettingsForm";
import { useI18n } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">{t.settings.title}</h1>
      <SettingsForm />
    </main>
  );
}
