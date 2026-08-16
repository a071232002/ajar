import Link from "next/link";
import AudioProvider from "@/components/AudioProvider";
import PlayButton from "@/components/PlayButton";
import ReadDoneButton from "@/components/ReadDoneButton";
import VariantTabs from "@/components/VariantTabs";
import VoiceSelect from "@/components/VoiceSelect";
import { allClipKeys, clipTexts } from "@/lib/clips";
import { formatLessonDate } from "@/lib/date";
import { renderMarked } from "@/lib/markup";
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
      {/* 檔案夾外框 */}
      <div className="folder-skin relative mx-auto max-w-[700px] rounded-xl px-4 pb-6 pt-4 shadow-[0_12px_30px_var(--shadow)] sm:px-5">
        {/* 資料夾頭部：案號 · 日期步進器 · 播放控制 */}
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="case-label">
            {categoryZh} · CASE #{String(dayNumber).padStart(3, "0")}
          </span>
          <nav className="daynav ml-auto" aria-label="切換日期">
            {prevDate ? (
              <Link
                href={`/lesson/${prevDate}`}
                className="daynav-step"
                aria-label="前一張"
              >
                ‹
              </Link>
            ) : (
              <span className="daynav-step is-off" aria-disabled="true">
                ‹
              </span>
            )}
            <span className="daynav-now">
              {formatLessonDate(lesson.lesson_date)}
            </span>
            {nextDate ? (
              <Link
                href={`/lesson/${nextDate}`}
                className="daynav-step"
                aria-label="後一張"
              >
                ›
              </Link>
            ) : (
              <span className="daynav-step is-off" aria-disabled="true">
                ›
              </span>
            )}
          </nav>
        </div>

        {/* 封面紙 */}
        <div className="sheet tilt-l animate-sheet-in mb-4">
          <span className="stamp absolute right-3 top-3 text-[14px] sm:right-4 sm:top-3.5 sm:text-[17px]">
            DAY {dayNumber}
          </span>
          <h1 className="pr-[76px] text-[19px] font-bold leading-snug sm:pr-24 sm:text-[25px]">
            {c.theme.zh}
          </h1>
          <p className="mt-1 font-mono text-[13px] text-soft">{c.theme.en}</p>
          <p className="mt-2 text-[14.5px] text-soft">{c.goal_zh}</p>
          {/* 連播控制放封面卡右下：整張卡的動作，屬於封面而不是資料夾邊條 */}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <VoiceSelect />
            <PlayButton id="all" clipKeys={allKeys} variant="pill" label="全部連播" />
          </div>
        </div>

        {/* 意思段 */}
        {c.meanings.map((m, i) => (
          <div key={i} className="sheet animate-sheet-in mb-4">
            <p className="hand-tag mb-3">
              意思 {i + 1}<span className="sub">{m.title_zh}</span>
            </p>
            <VariantTabs meaning={m} meaningIndex={i} />
          </div>
        ))}

        {/* Key Points */}
        {c.key_points.map((k, i) => (
          <div key={i} className="sheet tilt-r animate-sheet-in mb-4">
            <p className="hand-tag mb-2.5">
              Key Point<span className="sub">{k.title_zh}</span>
            </p>
            <p className="text-[14.5px]">{k.explain_zh}</p>
            <div className="say-row mt-3 rounded-md border-2 border-dashed border-accent px-4 py-3.5">
              <PlayButton id={`kp${i}`} clipKeys={[`kp${i}`]} />
              <div className="say-body">
                <p className="en">{renderMarked(k.example_en)}</p>
                <p className="mt-1 text-sm text-soft">{k.example_zh}</p>
              </div>
            </div>
          </div>
        ))}

        {/* 對話 */}
        <div className="sheet animate-sheet-in mb-4">
          <p className="hand-tag mb-4">對話</p>
          {c.dialogue.map((d, i) => (
            <div key={i} className="say-row mb-4">
              <PlayButton id={`dlg${i}`} clipKeys={[`dlg${i}`]} />
              <div
                className={`say-body border-l-2 pl-3.5 ${
                  d.side === "me" ? "border-accent" : "border-folder-deep"
                }`}
              >
                <p
                  className={`mb-0.5 font-mono text-xs ${
                    d.side === "me" ? "text-accent" : "text-soft"
                  }`}
                >
                  {d.speaker_zh}
                </p>
                <p className="en">{renderMarked(d.en)}</p>
                <p className="mt-1 text-sm text-soft">{d.zh}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 情境練習 */}
        <div className="sheet tilt-l animate-sheet-in mb-4">
          <p className="hand-tag mb-3">
            情境練習<span className="sub">先自己寫寫看</span>
          </p>
          <p className="whitespace-pre-line text-[15px]">{c.exercise.prompt_zh}</p>
          <details className="mt-3">
            <summary className="cursor-pointer font-medium text-accent">
              寫完了，展開參考答案
            </summary>
            <div className="say-row mt-3 rounded-md bg-hl/25 px-4 py-3.5">
              <PlayButton id="exercise" clipKeys={["exercise"]} />
              <div className="say-body">
                <p className="en">{renderMarked(c.exercise.model_en)}</p>
                <p className="mt-1.5 text-sm text-soft">{c.exercise.model_zh}</p>
              </div>
            </div>
          </details>
        </div>

        {/* 詞彙口袋 */}
        <div className="sheet tilt-r animate-sheet-in">
          <p className="hand-tag mb-3">單字口袋</p>
          <div className="flex flex-col">
            {c.vocab.map((v, i) => (
              <div
                key={v.phrase}
                className="say-row border-t border-[var(--edge)] py-2.5 first:border-t-0 first:pt-0"
              >
                <PlayButton id={`v${i}`} clipKeys={[`v${i}`]} />
                <div className="say-body flex flex-wrap items-baseline gap-x-3 gap-y-0.5 pt-1.5">
                  <span className="font-prose text-[16.5px] font-medium">
                    {v.phrase}
                  </span>
                  <span className="text-sm text-soft">{v.meaning_zh}</span>
                </div>
              </div>
            ))}
          </div>
          <ReadDoneButton lessonId={lesson.id} alreadyRead={lesson.read_at !== null} />
        </div>
      </div>
    </div>
  );
}
