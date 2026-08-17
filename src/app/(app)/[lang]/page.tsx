import { notFound } from "next/navigation";
import LessonView from "@/components/LessonView";
import { categoryZh } from "@/lib/categories";
import { diffDays, taipeiToday } from "@/lib/date";
import { isLang } from "@/lib/lang";
import {
  getAudioUrls,
  getFirstLessonDate,
  getLesson,
  getNeighborDates,
} from "@/lib/lesson-data";
import { getProfile } from "@/lib/profile-data";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const profile = await getProfile();
  if (!profile) notFound();

  const today = taipeiToday();
  const lesson = await getLesson(profile.id, lang, today);

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
    getFirstLessonDate(profile.id, lang),
    getNeighborDates(profile.id, lang, lesson.lesson_date),
    getAudioUrls(lesson.id),
  ]);

  const dayNumber = first ? diffDays(lesson.lesson_date, first) + 1 : 1;

  return (
    <LessonView
      lesson={lesson}
      lang={lang}
      dayNumber={dayNumber}
      categoryZh={categoryZh(lesson.topics?.category ?? "")}
      prevDate={prevDate}
      nextDate={nextDate}
      audioUrls={audioUrls}
    />
  );
}
