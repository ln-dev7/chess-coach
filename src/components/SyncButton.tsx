"use client";

import { useState } from "react";
import { fetchChesscomGames } from "@/lib/fetchers/chesscom";
import { fetchLichessGames } from "@/lib/fetchers/lichess";
import { useI18n } from "@/lib/i18n";
import { loadSettings, upsertGames } from "@/lib/storage";

export default function SyncButton({ onSynced }: { onSynced?: () => void }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function sync() {
    setState("busy");
    setMsg("");
    try {
      const settings = loadSettings();
      if (!settings.chesscomUsername && !settings.lichessUsername) {
        throw new Error(t.sync.noUsernames);
      }
      const maxGames = Math.max(settings.analyzeLastN * 2, 200);
      const [chesscom, lichess] = await Promise.all([
        settings.chesscomUsername ? fetchChesscomGames(settings.chesscomUsername, maxGames) : Promise.resolve([]),
        settings.lichessUsername ? fetchLichessGames(settings.lichessUsername, maxGames) : Promise.resolve([]),
      ]);
      const inserted = upsertGames([...chesscom, ...lichess]);
      setMsg(t.sync.result(inserted, chesscom.length, lichess.length));
      setState("done");
      onSynced?.();
    } catch (e) {
      setMsg((e as Error).message || t.sync.error);
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={sync}
        disabled={state === "busy"}
        className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 px-4 py-2 text-sm font-medium transition"
      >
        {state === "busy" ? t.sync.syncing : t.sync.button}
      </button>
      {msg && <span className={`text-sm ${state === "error" ? "text-red-500" : "text-muted-foreground"}`}>{msg}</span>}
    </div>
  );
}
