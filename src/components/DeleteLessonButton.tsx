"use client";

import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";

export default function DeleteLessonButton({ onConfirm }: { onConfirm: () => void }) {
  const { t } = useI18n();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          aria-label={t.lessons.delete}
          title={t.lessons.delete}
          className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10 transition"
        >
          <Trash2 className="size-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.lessons.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.lessons.deleteDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.lessons.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t.lessons.confirmDelete}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
