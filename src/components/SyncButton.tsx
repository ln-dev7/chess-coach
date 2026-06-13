"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { NoUsernamesError, syncGames } from "@/lib/sync";

export default function SyncButton({ onSynced }: { onSynced?: () => void }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function sync() {
    setState("busy");
    setMsg("");
    try {
      const { inserted, chesscom, lichess } = await syncGames();
      setMsg(t.sync.result(inserted, chesscom, lichess));
      setState("done");
      onSynced?.();
    } catch (e) {
      setMsg(e instanceof NoUsernamesError ? t.sync.noUsernames : (e as Error).message || t.sync.error);
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
