"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clearDayPlan, setDayPlan } from "@/app/(app)/[lang]/calendar/actions";
import type { Lang } from "@/lib/lang";

type Topic = { id: string; title_zh: string };

/**
 * 單日指定主題。預設收起來——行事曆主要是拿來看的，
 * 每一列都攤開七組表單會讓整頁沒辦法掃視。
 *
 * 存檔後必須自己呼叫 router.refresh()：
 * server action 只清得掉伺服端快取，客戶端的路由快取還留著這個網址的舊畫面，
 * 從 action 裡 redirect 回同一個網址也沒用（同址導覽不會重取）。
 */
export default function DayEditor({
  lang,
  date,
  topics,
  current,
}: {
  lang: Lang;
  date: string;
  topics: Topic[];
  current: { title_zh: string; source: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (action: (fd: FormData) => Promise<void>) => (fd: FormData) => {
    start(async () => {
      await action(fd);
      router.refresh();
      setOpen(false);
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`編輯 ${date}`}
        className="mt-1 ml-[92px] text-[12.5px] text-soft underline decoration-dotted underline-offset-4 hover:text-accent"
      >
        {current?.source === "user" ? "改這天" : "指定這天"}
      </button>
    );
  }

  return (
    <div className="mt-2 ml-[92px] rounded-md border border-[var(--edge)] bg-hl/10 p-3">
      <form action={run(setDayPlan)} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="date" value={date} />
        <select
          name="topic_id"
          aria-label={`${date} 的主題`}
          defaultValue=""
          className="rounded border border-soft/50 bg-paper px-2 py-1 text-[14px] text-ink"
        >
          <option value="">選一個主題</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title_zh}
            </option>
          ))}
        </select>
        <input
          name="title_zh"
          aria-label={`${date} 的題目`}
          placeholder="想指定題目就填（可留空）"
          className="min-w-0 flex-1 rounded border border-soft/40 bg-paper px-2 py-1 text-[14px] text-ink placeholder:text-soft/60"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-3 py-1 text-[13px] font-medium text-white disabled:opacity-60"
        >
          存
        </button>
      </form>

      <div className="mt-2 flex items-center gap-3">
        {current && (
          <form action={run(clearDayPlan)}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="date" value={date} />
            <button
              type="submit"
              disabled={pending}
              className="text-[12.5px] text-soft hover:text-accent disabled:opacity-60"
            >
              清掉這天
            </button>
          </form>
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[12.5px] text-soft hover:text-ink"
        >
          收起
        </button>
      </div>
    </div>
  );
}
