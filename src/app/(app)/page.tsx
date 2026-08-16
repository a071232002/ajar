import LessonView, { type LessonRow } from "@/components/LessonView";
import { lessonAudioUrls } from "@/lib/audio";
import { categoryZh } from "@/lib/categories";
import { diffDays, taipeiToday } from "@/lib/date";
import { neighborLessonDates } from "@/lib/lesson-nav";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = LessonRow & { chapters: { category: string } | null };

export default async function TodayPage() {
  const supabase = await createClient();
  const today = taipeiToday();

  const { data: lesson } = await supabase
    .from("daily_lessons")
    .select("id, lesson_date, theme_en, theme_zh, content, read_at, chapters(category)")
    .eq("lesson_date", today)
    .maybeSingle<Row>();

  if (!lesson) {
    return (
      <div className="mx-auto max-w-[700px]" data-testid="empty-state">
        <div className="sheet animate-skeleton mt-10 px-8 py-14 text-center">
          <p className="font-hand text-2xl text-accent">今天的卡片還沒歸檔。</p>
          <p className="mx-auto mt-4 max-w-[42ch] text-[15px] text-soft">
            內容通常於每天早上 5:00 自動送達；若過時仍未出現，到 Claude Code
            手動執行一次排程即可。
          </p>
        </div>
      </div>
    );
  }

  const [{ data: first }, { prevDate, nextDate }, audioUrls] = await Promise.all([
    supabase
      .from("daily_lessons")
      .select("lesson_date")
      .order("lesson_date", { ascending: true })
      .limit(1)
      .single<{ lesson_date: string }>(),
    neighborLessonDates(supabase, lesson.lesson_date),
    lessonAudioUrls(supabase, lesson.id),
  ]);

  const dayNumber = first ? diffDays(lesson.lesson_date, first.lesson_date) + 1 : 1;

  return (
    <LessonView
      lesson={lesson}
      dayNumber={dayNumber}
      categoryZh={categoryZh(lesson.chapters?.category ?? "")}
      prevDate={prevDate}
      nextDate={nextDate}
      audioUrls={audioUrls}
    />
  );
}
