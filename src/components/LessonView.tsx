import Link from "next/link";
import AudioProvider from "@/components/AudioProvider";
import PlayButton from "@/components/PlayButton";
import ReadDoneButton from "@/components/ReadDoneButton";
import VariantTabs from "@/components/VariantTabs";
import VoiceSelect from "@/components/VoiceSelect";
import { allClipKeys, clipTexts } from "@/lib/clips";
import { formatLessonDate } from "@/lib/date";
import type { LessonContent } from "@/lib/lesson-schema";

export type LessonRow = {
  id: string;
  lesson_date: string;
  theme_en: string;
  theme_zh: string;
  content: LessonContent;
  read_at: string | null;
};

export default function LessonView({
  lesson,
  dayNumber,
  categoryZh,
  prevDate,
  nextDate,
  audioUrls,
}: {
  lesson: LessonRow;
  dayNumber: number;
  categoryZh: string;
  /** 最近一張較舊/較新卡片的日期（無則 null） */
  prevDate: string | null;
  nextDate: string | null;
  /** clip_key → 公開音檔 URL（缺的自動退回瀏覽器語音） */
  audioUrls: Record<string, string>;
}) {
  const c = lesson.content;
  const allKeys = allClipKeys(c);
  const texts = clipTexts(c);

  return (
    <div data-testid="lesson">
      <AudioProvider urls={audioUrls} texts={texts} />
      {/* 前後張切換 */}
      <div className="mx-auto mb-3 flex max-w-[700px] items-center justify-between px-1">
        {prevDate ? (
          <Link
            href={`/lesson/${prevDate}`}
            className="rounded border border-soft/50 bg-paper px-3 py-1 text-sm text-soft hover:text-ink"
          >
            ‹ 前一張
          </Link>
        ) : (
          <span />
        )}
        <span className="font-mono text-xs text-soft">{lesson.lesson_date}</span>
        {nextDate ? (
          <Link
            href={`/lesson/${nextDate}`}
            className="rounded border border-soft/50 bg-paper px-3 py-1 text-sm text-soft hover:text-ink"
          >
            後一張 ›
          </Link>
        ) : (
          <span />
        )}
      </div>

      {/* 檔案夾外框 */}
      <div className="relative mx-auto max-w-[700px] rounded-xl bg-folder px-4 pb-6 pt-14 shadow-[0_12px_30px_var(--shadow)] sm:px-5">
        <span className="font-hand absolute -top-1 left-8 z-[2] text-xl font-semibold">
          {categoryZh} · CASE #{String(dayNumber).padStart(3, "0")}
        </span>
        <span className="absolute right-5 top-4 font-mono text-xs opacity-75">
          {formatLessonDate(lesson.lesson_date)}
        </span>
        <div className="absolute right-4 top-9 z-[2] flex items-center gap-2 sm:right-5">
          <VoiceSelect />
          <PlayButton id="all" clipKeys={allKeys} variant="pill" label="全部連播" />
        </div>

        {/* 封面紙 */}
        <div className="sheet tilt-l animate-sheet-in mb-4 mt-6">
          <span className="stamp absolute right-4 top-3.5 text-[17px]">
            DAY {dayNumber}
          </span>
          <h1 className="pr-24 text-[23px] font-bold leading-snug sm:text-[25px]">
            {c.theme.zh}
          </h1>
          <p className="mt-1 font-mono text-[13px] text-soft">{c.theme.en}</p>
          <p className="mt-2 text-[14.5px] text-soft">{c.goal_zh}</p>
        </div>

        {/* 意思段 */}
        {c.meanings.map((m, i) => (
          <div key={i} className="sheet animate-sheet-in mb-4">
            <p className="hand-tag mb-2.5">
              意思 {i + 1} · {m.title_zh}
            </p>
            <VariantTabs meaning={m} meaningIndex={i} />
          </div>
        ))}

        {/* Key Points */}
        {c.key_points.map((k, i) => (
          <div key={i} className="sheet tilt-r animate-sheet-in mb-4">
            <p className="hand-tag mb-2">🔑 Key Point · {k.title_zh}</p>
            <p className="text-[14.5px]">{k.explain_zh}</p>
            <div className="mt-3 rounded-md border-2 border-dashed border-accent px-4 py-3.5">
              <p className="en">
                {k.example_en}
                <PlayButton id={`kp${i}`} clipKeys={[`kp${i}`]} />
              </p>
              <p className="mt-1 text-sm text-soft">{k.example_zh}</p>
            </div>
          </div>
        ))}

        {/* 對話 */}
        <div className="sheet animate-sheet-in mb-4">
          <p className="hand-tag mb-3">對話</p>
          {c.dialogue.map((d, i) => (
            <div key={i} className="mb-3 flex gap-2.5">
              <span
                className={`w-14 flex-none pt-1 text-right font-mono text-xs ${
                  d.side === "me" ? "text-accent" : "text-soft"
                }`}
              >
                {d.speaker_zh}
              </span>
              <div
                className={`border-l-2 pl-3.5 ${
                  d.side === "me" ? "border-accent" : "border-folder-deep"
                }`}
              >
                <p className="en">
                  {d.en}
                  <PlayButton id={`dlg${i}`} clipKeys={[`dlg${i}`]} />
                </p>
                <p className="mt-1 text-sm text-soft">{d.zh}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 情境練習 */}
        <div className="sheet tilt-l animate-sheet-in mb-4">
          <p className="hand-tag mb-2">情境練習 ✏️ · 先自己寫寫看</p>
          <p className="whitespace-pre-line text-[15px]">{c.exercise.prompt_zh}</p>
          <details className="mt-3">
            <summary className="cursor-pointer font-medium text-accent">
              寫完了，展開參考答案
            </summary>
            <div className="mt-3 rounded-md bg-hl/25 px-4 py-3.5">
              <p className="en">
                {c.exercise.model_en}
                <PlayButton id="exercise" clipKeys={["exercise"]} />
              </p>
              <p className="mt-1.5 text-sm text-soft">{c.exercise.model_zh}</p>
            </div>
          </details>
        </div>

        {/* 詞彙口袋 */}
        <div className="sheet tilt-r animate-sheet-in">
          <p className="hand-tag mb-3">單字口袋</p>
          <div className="flex flex-wrap gap-2">
            {c.vocab.map((v, i) => (
              <span
                key={v.phrase}
                className="font-prose flex items-center gap-2 rounded border border-soft/60 bg-paper px-3 py-1.5 text-[15.5px] font-medium shadow-[2px_2px_0_var(--shadow)]"
              >
                {v.phrase}
                <span className="text-sm font-normal text-soft">
                  {v.meaning_zh}
                </span>
                <PlayButton id={`v${i}`} clipKeys={[`v${i}`]} />
              </span>
            ))}
          </div>
          <ReadDoneButton lessonId={lesson.id} alreadyRead={lesson.read_at !== null} />
        </div>
      </div>
    </div>
  );
}
