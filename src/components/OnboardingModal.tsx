"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Logo from "./Logo";
import { useI18n } from "@/lib/i18n";
import { useOnboardedFlag, useSettings, useStoreHydrated } from "@/lib/store";
import { loadSettings, saveSettings, setOnboarded } from "@/lib/storage";

/** First-visit gate: requires at least one platform username before using the app. */
export default function OnboardingModal() {
  const { t } = useI18n();
  const hydrated = useStoreHydrated();
  const onboardedFlag = useOnboardedFlag();
  const settings = useSettings();
  const [chesscom, setChesscom] = useState("");
  const [lichess, setLichess] = useState("");
  const [error, setError] = useState(false);

  // Known only once the store is hydrated; stays closed during SSR / first render.
  const open = hydrated && !(onboardedFlag || settings.chesscomUsername || settings.lichessUsername);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!chesscom.trim() && !lichess.trim()) {
      setError(true);
      return;
    }
    saveSettings({ ...loadSettings(), chesscomUsername: chesscom.trim(), lichessUsername: lichess.trim() });
    setOnboarded();
    // The reactive store update closes the modal — no reload needed.
  }

  const input =
    "h-10 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 outline-none w-full";

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <Logo className="w-6 h-6" />
            <AlertDialogTitle>{t.onboarding.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{t.onboarding.desc}</AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {t.settings.chesscom}
            <input
              className={input}
              value={chesscom}
              onChange={(e) => {
                setChesscom(e.target.value);
                setError(false);
              }}
              placeholder="magnus_carlsen"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {t.settings.lichess}
            <input
              className={input}
              value={lichess}
              onChange={(e) => {
                setLichess(e.target.value);
                setError(false);
              }}
              placeholder="DrNykterstein"
            />
          </label>

          {error && <p className="text-sm text-red-500">{t.onboarding.required}</p>}

          <button
            type="submit"
            className="self-end rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition"
          >
            {t.onboarding.start}
          </button>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
