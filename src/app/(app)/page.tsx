import LessonView from "@/components/LessonView";
import { categoryZh } from "@/lib/categories";
import { diffDays, taipeiToday } from "@/lib/date";
import {
  getAudioUrls,
  getFirstLessonDate,
  getLesson,
  getNeighborDates,
} from "@/lib/lesson-data";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const today = taipeiToday();
  const lesson = await getLesson(today);

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

  const [first, { prevDate, nextDate }, audioUrls] = await Promise.all([
    getFirstLessonDate(),
    getNeighborDates(lesson.lesson_date),
    getAudioUrls(lesson.id),
  ]);

  const dayNumber = first ? diffDays(lesson.lesson_date, first) + 1 : 1;

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
