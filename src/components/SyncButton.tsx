"use client";

import { useState } from "react";
import { toast } from "sonner";
import { describeError } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { NoUsernamesError, syncGames } from "@/lib/sync";

export default function SyncButton({ onSynced }: { onSynced?: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    try {
      const { inserted, chesscom, lichess } = await syncGames();
      toast.success(t.sync.result(inserted, chesscom, lichess));
      onSynced?.();
    } catch (e) {
      toast.error(e instanceof NoUsernamesError ? t.sync.noUsernames : describeError(e, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={sync}
      disabled={busy}
      className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 px-4 py-2 text-sm font-medium transition"
    >
      {busy ? t.sync.syncing : t.sync.button}
    </button>
  );
}
