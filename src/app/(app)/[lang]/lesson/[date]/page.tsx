import { notFound } from "next/navigation";
import LessonView from "@/components/LessonView";
import { categoryZh } from "@/lib/categories";
import { diffDays } from "@/lib/date";
import { isLang } from "@/lib/lang";
import {
  getAudioUrls,
  getFirstLessonDate,
  getLesson,
  getNeighborDates,
} from "@/lib/lesson-data";
import { getProfile } from "@/lib/profile-data";

export const dynamic = "force-dynamic";

export default async function LessonByDatePage({
  params,
}: {
  params: Promise<{ lang: string; date: string }>;
}) {
  const { lang, date } = await params;
  if (!isLang(lang)) notFound();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const profile = await getProfile();
  if (!profile) notFound();

  const lesson = await getLesson(profile.id, lang, date);
  if (!lesson) notFound();

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
