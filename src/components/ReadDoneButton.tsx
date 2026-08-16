"use client";

import { useState, useTransition } from "react";
import { markLessonRead } from "@/app/(app)/actions";

export default function ReadDoneButton({
  lessonId,
  alreadyRead,
}: {
  lessonId: string;
  alreadyRead: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [justDone, setJustDone] = useState(false);

  if (alreadyRead || justDone) {
    return (
      <p className="stamp mx-auto mt-6 w-fit text-[17px]" data-testid="read-done">
        ✓ FILED · 今天讀完了
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markLessonRead(lessonId);
          setJustDone(true);
        })
      }
      className="mx-auto mt-6 block rounded-md bg-accent px-10 py-3 font-bold text-white shadow-[3px_3px_0_var(--shadow)] transition-transform active:translate-y-0.5 disabled:opacity-60"
    >
      ✓ 今天讀完了，歸檔
    </button>
  );
}
